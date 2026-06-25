// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GENERATE_ANSWER") {
    handleGenerateAnswer(request.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep the message channel open for async response
  }
});

async function handleGenerateAnswer(payload) {
  const { question, type, options } = payload;

  // Retrieve settings
  const settings = await chrome.storage.sync.get(["groqApiKey", "groqModel", "profile", "customFields"]);
  
  if (!settings.groqApiKey) {
    throw new Error("Groq API Key is not set. Please set it in the extension popup.");
  }

  const model = settings.groqModel || "llama-3.3-70b-versatile";
  
  // Build Profile Context
  let profileContext = "User Profile Information:\n";
  if (settings.profile) {
    if (settings.profile.name) profileContext += `- Name: ${settings.profile.name}\n`;
    if (settings.profile.email) profileContext += `- Email: ${settings.profile.email}\n`;
    if (settings.profile.dob) profileContext += `- Date of Birth: ${settings.profile.dob}\n`;
    if (settings.profile.regNo) profileContext += `- Register Number: ${settings.profile.regNo}\n`;
    if (settings.profile.dept) profileContext += `- Department: ${settings.profile.dept}\n`;
    if (settings.profile.rating) profileContext += `- Default Feedback Rating: ${settings.profile.rating}\n`;
    if (settings.profile.tone) profileContext += `- AI Answer Tone Preference: ${settings.profile.tone}\n`;
  }
  
  if (settings.customFields && settings.customFields.length > 0) {
    profileContext += "Custom Attributes:\n";
    settings.customFields.forEach(field => {
      profileContext += `- ${field.key}: ${field.value}\n`;
    });
  }

  if (profileContext === "User Profile Information:\n") {
    profileContext = "No user profile information provided.\n";
  }

  // Build System Prompt
  const now = new Date();
  const currentDate = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  const { currentValue, formContext } = payload;

  let systemPrompt = `You are an AI assistant helping a user fill out a form automatically.
You must provide ONLY the final answer to the question based on the user's profile.
Do NOT provide explanations, pleasantries, or markdown formatting. Just the raw answer.

CURRENT REAL-WORLD DATE AND TIME:
- Today's Date: ${currentDate}
- Current Time: ${currentTime}

${profileContext}`;

  if (formContext) {
    systemPrompt += `\n\nCRITICAL FORM-SPECIFIC INSTRUCTIONS FROM USER:\n${formContext}\n\nYou MUST prioritize these instructions above all else for this form.`;
  }

  // Build User Prompt
  let userPrompt = `Question: "${question}"\nQuestion Type: ${type}\n`;
  
  if (currentValue && currentValue.trim() !== "") {
    userPrompt += `Current Value in Field: "${currentValue}"\n`;
    userPrompt += `NOTE: The user has already started typing or provided some content. Use this existing content to guide, expand upon, or formulate your final response.\n\n`;
  }
  
  if (options && options.length > 0) {
    userPrompt += `Available Options:\n`;
    options.forEach((opt) => {
      userPrompt += `- ${opt}\n`;
    });
    userPrompt += `\nINSTRUCTION: You MUST choose exactly ONE option from the list above. Return ONLY the exact text of the option you chose.`;
  } else {
    userPrompt += `\nINSTRUCTION: Generate a concise and appropriate text response for this question based on the user's profile and any existing content provided.`;
  }

  // Make API Call to Groq
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.groqApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_completion_tokens: 150
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  let answer = data.choices[0].message.content.trim();
  
  // Clean up potential quotes if the AI wrapped the answer in them
  if (answer.startsWith('"') && answer.endsWith('"')) {
    answer = answer.substring(1, answer.length - 1);
  }

  return answer;
}
