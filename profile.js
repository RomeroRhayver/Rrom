async function loadProfile() {
    const response = await fetch("/profile");

    if (!response.ok) {
        window.location.href = "auth.html";
        return;
    }

    const profile = await response.json();

    // Display name
    document.querySelector("#profileDisplayName").textContent =
        profile.display_name || profile.username;

    // Username
    document.querySelector("#profileUsername").textContent =
        "@" + profile.username;

    // Email
    document.querySelector("#profileEmail").textContent =
        profile.email;

    // Post statistics
    document.querySelector("#postCount").textContent =
        profile.postCount;

    document.querySelector("#likesCount").textContent =
        profile.likesReceived;

    // About Me
    document.querySelector("#profileBio").textContent =
        profile.bio || "No About Me yet.";

    // Profile picture
    const picture = document.querySelector("#profilePicture");

    if (profile.profile_picture) {
        picture.innerHTML = `
            <img
                src="${escapeHTML(profile.profile_picture)}"
                alt="Profile picture"
            >
        `;
    } else {
        picture.textContent =
            (profile.display_name || profile.username)
            .charAt(0)
            .toUpperCase();
    }

    // Put current values into edit fields
    document.querySelector("#displayNameInput").value =
        profile.display_name || profile.username;

    document.querySelector("#bioInput").value =
        profile.bio || "";
}


// EDIT PROFILE
document
    .querySelector("#editProfileButton")
    .addEventListener("click", () => {

        document.querySelector("#editProfileSection").style.display =
            "block";
    });


// CANCEL EDIT
document
    .querySelector("#cancelProfileButton")
    .addEventListener("click", () => {

        document.querySelector("#editProfileSection").style.display =
            "none";
    });


// SAVE PROFILE
document
    .querySelector("#saveProfileButton")
    .addEventListener("click", async () => {

        const displayName =
            document.querySelector("#displayNameInput").value.trim();

        const bio =
            document.querySelector("#bioInput").value.trim();

        const profilePicture =
            document.querySelector("#profilePictureInput").value.trim();

        const message =
            document.querySelector("#profileMessage");

        const response = await fetch("/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                display_name: displayName,
                bio: bio,
                profile_picture: profilePicture
            })
        });

        const result = await response.json();

        message.textContent = result.message;

        if (result.success) {

            document.querySelector("#editProfileSection")
                .style.display = "none";

            await loadProfile();
        }
    });


// LOGOUT
document
    .querySelector("#logoutButton")
    .addEventListener("click", async () => {

        await fetch("/logout", {
            method: "POST"
        });

        window.location.href = "index.html";
    });


// Prevent user-entered HTML
function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


loadProfile();