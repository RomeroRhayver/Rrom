const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.querySelector("#signupUsername").value;
    const email = document.querySelector("#signupEmail").value;
    const password = document.querySelector("#signupPassword").value;

    const response = await fetch("/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            email: email,
            password: password
        })
    });

    const result = await response.json();

    document.querySelector("#signupMessage").textContent = result.message;
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.querySelector("#loginEmail").value;
    const password = document.querySelector("#loginPassword").value;

    const response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const result = await response.json();

    if (result.success) {
    window.location.href = "dashboard.html";
} else {
    document.querySelector("#loginMessage").textContent = result.message;
}
});
