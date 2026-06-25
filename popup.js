document.addEventListener("DOMContentLoaded", () => {
  const groqApiKeyInput = document.getElementById("groqApiKey");
  const groqModelSelect = document.getElementById("groqModel");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const dobInput = document.getElementById("dob");
  const regNoInput = document.getElementById("regNo");
  const deptInput = document.getElementById("dept");
  const ratingSelect = document.getElementById("rating");
  const toneSelect = document.getElementById("tone");
  const customFieldsContainer = document.getElementById("customFieldsContainer");
  const addCustomBtn = document.getElementById("addCustomBtn");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");

  // Load existing settings
  chrome.storage.sync.get(["groqApiKey", "groqModel", "profile", "customFields"], (result) => {
    if (result.groqApiKey) groqApiKeyInput.value = result.groqApiKey;
    if (result.groqModel) groqModelSelect.value = result.groqModel;
    
    if (result.profile) {
      nameInput.value = result.profile.name || "";
      emailInput.value = result.profile.email || "";
      dobInput.value = result.profile.dob || "";
      regNoInput.value = result.profile.regNo || "";
      deptInput.value = result.profile.dept || "";
      if (result.profile.rating) ratingSelect.value = result.profile.rating;
      if (result.profile.tone) toneSelect.value = result.profile.tone;
    }

    if (result.customFields && result.customFields.length > 0) {
      result.customFields.forEach(field => addCustomFieldRow(field.key, field.value));
    }
  });

  function addCustomFieldRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "custom-field-row";
    
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "Key (e.g. Skills)";
    keyInput.value = key;
    keyInput.className = "custom-key";

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "Value (e.g. React)";
    valueInput.value = value;
    valueInput.className = "custom-value";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.title = "Remove field";
    removeBtn.onclick = () => row.remove();

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);

    customFieldsContainer.appendChild(row);
  }

  addCustomBtn.addEventListener("click", () => addCustomFieldRow());

  saveBtn.addEventListener("click", () => {
    const customFields = [];
    document.querySelectorAll(".custom-field-row").forEach(row => {
      const key = row.querySelector(".custom-key").value.trim();
      const value = row.querySelector(".custom-value").value.trim();
      if (key || value) {
        customFields.push({ key, value });
      }
    });

    const settings = {
      groqApiKey: groqApiKeyInput.value.trim(),
      groqModel: groqModelSelect.value,
      profile: {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        dob: dobInput.value,
        regNo: regNoInput.value.trim(),
        dept: deptInput.value.trim(),
        rating: ratingSelect.value,
        tone: toneSelect.value
      },
      customFields
    };

    chrome.storage.sync.set(settings, () => {
      saveStatus.textContent = "Settings saved successfully!";
      setTimeout(() => {
        saveStatus.textContent = "";
      }, 3000);
    });
  });
});
