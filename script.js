async function updateNavigation() {
    try {
        const response = await fetch("/me");
        const user = await response.json();

        console.log("Current user:", user);

        const navigation = document.querySelector("#userNavigation");

        if (!navigation) {
            console.error("userNavigation not found!");
            return;
        }

        if (user.loggedIn) {

            navigation.innerHTML = `
                <a href="dashboard.html">Dashboard</a>
                <a href="posts.html">Posts</a>
                <a href="profile.html">Profile</a>
                <a href="admin.html" id="adminLink">Admin Panel</a>
                <button id="logoutButton">Logout</button>
            `;

            // Hide Admin Panel for non-admin users
            if (!user.isAdmin) {
                document.querySelector("#adminLink").style.display = "none";
            }

            document
                .querySelector("#logoutButton")
                .addEventListener("click", async () => {

                    await fetch("/logout", {
                        method: "POST"
                    });

                    window.location.href = "index.html";
                });

        } else {

            navigation.innerHTML = `
                <a href="auth.html">Login / Sign Up</a>
            `;
        }

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

updateNavigation();