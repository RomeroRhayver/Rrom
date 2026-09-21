// ============================== 
// PROFILE PICTURE
// ==============================

function setProfilePicture(element, imageUrl, name) {

    if (!element) {
        return;
    }

    element.innerHTML = "";

    const safeName = name || "User";

    if (imageUrl && imageUrl.trim() !== "") {

        const image = document.createElement("img");

        image.src = imageUrl;
        image.alt = `${safeName}'s profile picture`;

        image.onerror = function () {
            element.innerHTML = "";
            element.textContent = safeName.charAt(0).toUpperCase();
        };

        element.appendChild(image);

    } else {

        element.textContent =
            safeName.charAt(0).toUpperCase();

    }
}


// ==============================
// LOAD USER
// ==============================

async function loadUser() {

    try {

        const response = await fetch("/me", {
            credentials: "same-origin"
        });

        const user = await response.json();

        if (!user.loggedIn) {
            window.location.href = "auth.html";
            return false;
        }

        const displayName =
            user.display_name || user.username;

        // Welcome
        const welcomeText =
            document.querySelector("#welcomeText");

        if (welcomeText) {
            welcomeText.textContent =
                `Welcome, ${displayName}!`;
        }

        // Username
        const profileUsername =
            document.querySelector("#profileUsername");

        if (profileUsername) {
            profileUsername.textContent =
                displayName;
        }

        // Profile picture
        const profilePicture =
            document.querySelector("#profilePicture");

        setProfilePicture(
            profilePicture,
            user.profile_picture,
            displayName
        );

        // Email
        const emailElement =
            document.querySelector("#profileEmail");

        if (emailElement) {
            emailElement.textContent =
                user.email;
        }

        // About Me
        const bioElement =
            document.querySelector("#profileBio");

        if (bioElement) {
            bioElement.textContent =
                user.bio || "No About Me yet.";
        }

        // Post count
        const postCount =
            document.querySelector("#postCount");

        if (postCount) {
            postCount.textContent =
                user.postCount || 0;
        }

        // Admin
        const adminButton =
            document.querySelector("#adminButton");

        if (adminButton && user.isAdmin) {
            adminButton.style.display =
                "inline-block";
        }

        return true;

    } catch (error) {

        console.error("Error loading user:", error);
        return false;
    }
}


// ==============================
// LOAD POSTS
// ==============================

async function loadPosts() {

    try {

        const response = await fetch("/posts", {
            credentials: "same-origin"
        });

        const posts = await response.json();

        const container =
            document.querySelector("#postsContainer");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (posts.length === 0) {

            container.textContent =
                "No posts yet. Be the first to post!";

            return;
        }

        posts.forEach(post => {

            const postElement =
                document.createElement("div");

            postElement.className = "post";


            // Profile picture
            const profilePicture =
                document.createElement("div");

            profilePicture.className =
                "post-profile-picture";

            const name =
                post.display_name ||
                post.username;

            setProfilePicture(
                profilePicture,
                post.profile_picture,
                name
            );


            // Post body
            const postBody =
                document.createElement("div");

            postBody.className =
                "post-body";


            // Header
            const postHeader =
                document.createElement("div");

            postHeader.className =
                "post-header";


            // Display name
            const username =
                document.createElement("h4");

            username.textContent =
                name;


            // Username
            const usernameTag =
                document.createElement("small");

            usernameTag.textContent =
                `@${post.username}`;


            // Date
            const date =
                document.createElement("small");

            date.textContent =
                post.created_at;


            postHeader.appendChild(username);
            postHeader.appendChild(usernameTag);
            postHeader.appendChild(date);


            // Content
            const content =
                document.createElement("p");

            content.className =
                "post-content";

            content.textContent =
                post.content;


            postBody.appendChild(postHeader);
            postBody.appendChild(content);

            postElement.appendChild(profilePicture);
            postElement.appendChild(postBody);

            container.appendChild(postElement);

        });

    } catch (error) {

        console.error("Error loading posts:", error);

    }
}


// ==============================
// CREATE POST
// ==============================

const postForm =
    document.querySelector("#postForm");

if (postForm) {

    postForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const contentInput =
                document.querySelector("#postContent");

            const message =
                document.querySelector("#postMessage");

            const content =
                contentInput.value.trim();

            if (!content) {

                message.textContent =
                    "Please write something first.";

                return;
            }

            try {

                const response =
                    await fetch("/posts", {

                        method: "POST",

                        credentials: "same-origin",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            content: content
                        })

                    });

                const result =
                    await response.json();

                message.textContent =
                    result.message;

                if (result.success) {

                    contentInput.value = "";

                    await loadPosts();

                    setTimeout(function () {

                        message.textContent = "";

                    }, 2000);
                }

            } catch (error) {

                console.error(
                    "Error creating post:",
                    error
                );

                message.textContent =
                    "Something went wrong.";
            }

        }
    );

}


// ==============================
// LOGOUT
// ==============================

const logoutButton =
    document.querySelector("#logoutButton");

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            await fetch("/logout", {
                method: "POST",
                credentials: "same-origin"
            });

            window.location.href =
                "auth.html";

        }
    );

}


// ==============================
// START
// ==============================

async function start() {

    const loggedIn =
        await loadUser();

    if (!loggedIn) {
        return;
    }

    await loadPosts();
}

start();
