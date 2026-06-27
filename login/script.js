/* =================================================================
   Smart Paper Mill Production Monitoring Dashboard
   Login Page — JavaScript
   Handles: password toggle, validation, remember-me,
            and a simulated login flow (no backend yet).
   ================================================================= */

(function () {
  "use strict";

  /* ---------- Demo credentials (frontend-only placeholder) ----------
     Replace this with a real API call to your backend in the build phase. */
  const DEMO_USER = "admin";
  const DEMO_PASS = "admin123";

  /* ---------- Element references ---------- */
  const form          = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("remember");
  const loginBtn      = document.getElementById("loginBtn");
  const togglePass    = document.getElementById("togglePassword");
  const formMessage   = document.getElementById("formMessage");
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");
  const eyeIcon       = togglePass.querySelector(".icon-eye");
  const eyeOffIcon    = togglePass.querySelector(".icon-eye-off");

  /* ---------- Pre-fill remembered username ---------- */
  const savedUser = localStorage.getItem("smm_rememberedUser");
  if (savedUser) {
    usernameInput.value = savedUser;
    rememberInput.checked = true;
    passwordInput.focus();
  } else {
    usernameInput.focus();
  }

  /* =================================================================
     Show / hide password
     ================================================================= */
  togglePass.addEventListener("click", function () {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    eyeIcon.hidden = isHidden;
    eyeOffIcon.hidden = !isHidden;
    togglePass.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    passwordInput.focus();
  });

  /* =================================================================
     Validation helpers
     ================================================================= */
  function setFieldError(input, errorEl, message) {
    input.closest(".input-shell").classList.add("invalid");
    errorEl.textContent = message;
  }

  function clearFieldError(input, errorEl) {
    input.closest(".input-shell").classList.remove("invalid");
    errorEl.textContent = "";
  }

  function showFormMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = "form-message show " + type;
  }

  function hideFormMessage() {
    formMessage.className = "form-message";
  }

  /* Clear inline errors as the user types */
  usernameInput.addEventListener("input", () => clearFieldError(usernameInput, usernameError));
  passwordInput.addEventListener("input", () => clearFieldError(passwordInput, passwordError));

  function validate() {
    let valid = true;
    hideFormMessage();

    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (user === "") {
      setFieldError(usernameInput, usernameError, "Username is required.");
      valid = false;
    }

    if (pass === "") {
      setFieldError(passwordInput, passwordError, "Password is required.");
      valid = false;
    } else if (pass.length < 4) {
      setFieldError(passwordInput, passwordError, "Password must be at least 4 characters.");
      valid = false;
    }

    return valid;
  }

  /* =================================================================
     Submit handler — real authentication against the backend API
     POST /api/login  ->  { token, user }
     ================================================================= */
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validate()) return;

    loginBtn.classList.add("loading");
    loginBtn.disabled = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        loginBtn.classList.remove("loading");
        loginBtn.disabled = false;

        if (result.ok) {
          // Persist the JWT and the signed-in user for the rest of the app.
          localStorage.setItem("smm_token", result.data.token);
          localStorage.setItem("smm_user", JSON.stringify(result.data.user));

          if (rememberInput.checked) {
            localStorage.setItem("smm_rememberedUser", username);
          } else {
            localStorage.removeItem("smm_rememberedUser");
          }

          showFormMessage("Welcome, " + result.data.user.name + ". Redirecting…", "success");
          loginBtn.querySelector(".btn-label").textContent = "Success";
          setTimeout(function () { window.location.href = "../dashboard/index.html"; }, 700);
        } else {
          showFormMessage(result.data.error || "Invalid username or password.", "error");
          passwordInput.value = "";
          passwordInput.focus();
        }
      })
      .catch(function () {
        loginBtn.classList.remove("loading");
        loginBtn.disabled = false;
        showFormMessage("Cannot reach the server. Start the backend (python backend/app.py) and open the app at http://localhost:5000.", "error");
      });
  });
})();
