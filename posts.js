// ==============================
// CHECK LOGIN
// ==============================

async function checkLogin() {

    const response = await fetch("/me", {
        credentials: "same-origin"
    });

    const user = await response.json();

    if (!user.loggedIn) {
        window.location.href = "auth.html";
        return false;
    }

    return true;
}


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

        image.onerror = () => {

            element.innerHTML = "";

            element.textContent =
                safeName.charAt(0).toUpperCase();

        };

        element.appendChild(image);

    } else {

        element.textContent =
            safeName.charAt(0).toUpperCase();

    }
}


// ==============================
// LOAD POSTS
// ==============================

async function loadPosts() {

    const response = await fetch("/posts", {
        credentials: "same-origin"
    });

    if (!response.ok) {
        console.error("Could not load posts.");
        return;
    }

    const posts = await response.json();

    const container =
        document.querySelector("#postsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (posts.length === 0) {

        container.textContent =
            "No posts yet.";

        return;
    }


    posts.forEach(post => {

        const postElement =
            document.createElement("div");

        postElement.className =
            "full-post";


        // ==============================
        // PROFILE PICTURE
        // ==============================

        const profilePicture =
            document.createElement("div");

        profilePicture.className =
            "post-profile-picture";

        const postName =
            post.display_name ||
            post.username ||
            "User";

        setProfilePicture(
            profilePicture,
            post.profile_picture,
            postName
        );


        // ==============================
        // POST BODY
        // ==============================

        const postBody =
            document.createElement("div");

        postBody.className =
            "post-body";


        // ==============================
        // HEADER
        // ==============================

        const postHeader =
            document.createElement("div");

        postHeader.className =
            "post-header";


        const username =
            document.createElement("h4");

        username.textContent =
            postName;


        const usernameTag =
            document.createElement("small");

        usernameTag.textContent =
            `@${post.username}`;


        const date =
            document.createElement("small");

        date.textContent =
            post.created_at;


        postHeader.appendChild(username);
        postHeader.appendChild(usernameTag);
        postHeader.appendChild(date);


        // ==============================
        // CONTENT
        // ==============================

        const content =
            document.createElement("p");

        content.className =
            "post-content";

        content.textContent =
            post.content;


        // ==============================
        // ACTIONS
        // ==============================

        const actions =
            document.createElement("div");

        actions.className =
            "post-actions";


        // LIKE BUTTON

        const likeButton =
            document.createElement("button");

        likeButton.className =
            "like-button";

        likeButton.textContent =
            `👍 ${post.like_count}`;


        likeButton.addEventListener(
            "click",
            async () => {

                const response =
                    await fetch(
                        `/posts/${post.id}/like`,
                        {
                            method: "POST",
                            credentials: "same-origin"
                        }
                    );

                const result =
                    await response.json();

                if (result.success) {
                    await loadPosts();
                }

            }
        );


        // REPLY BUTTON

        const replyButton =
            document.createElement("button");

        replyButton.className =
            "reply-button";

        replyButton.textContent =
            "💬 Reply";


        actions.appendChild(likeButton);
        actions.appendChild(replyButton);


        // ==============================
        // REPLY AREA
        // ==============================

        const replyArea =
            document.createElement("div");

        replyArea.className =
            "reply-area";

        replyArea.style.display =
            "none";


        const replyInput =
            document.createElement("textarea");

        replyInput.placeholder =
            "Write a reply...";

        replyInput.rows = 3;


        const replySubmit =
            document.createElement("button");

        replySubmit.textContent =
            "Post Reply";


        const repliesContainer =
            document.createElement("div");

        repliesContainer.className =
            "replies-container";


        replyArea.appendChild(replyInput);
        replyArea.appendChild(replySubmit);
        replyArea.appendChild(repliesContainer);


        // SHOW / HIDE REPLIES

        replyButton.addEventListener(
            "click",
            () => {

                if (
                    replyArea.style.display ===
                    "none"
                ) {

                    replyArea.style.display =
                        "block";

                } else {

                    replyArea.style.display =
                        "none";

                }

            }
        );


        // SUBMIT REPLY

        replySubmit.addEventListener(
            "click",
            async () => {

                const replyContent =
                    replyInput.value.trim();

                if (!replyContent) {
                    return;
                }


                const response =
                    await fetch(
                        "/replies",
                        {
                            method: "POST",
                            credentials: "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                postId: post.id,
                                content: replyContent
                            })
                        }
                    );


                const result =
                    await response.json();


                if (result.success) {

                    replyInput.value = "";

                    await loadReplies(
                        post.id,
                        repliesContainer
                    );

                } else {

                    alert(result.message);

                }

            }
        );


        // ==============================
        // BUILD POST
        // ==============================

        postBody.appendChild(postHeader);
        postBody.appendChild(content);
        postBody.appendChild(actions);
        postBody.appendChild(replyArea);

        postElement.appendChild(profilePicture);
        postElement.appendChild(postBody);

        container.appendChild(postElement);


        // Load replies

        loadReplies(
            post.id,
            repliesContainer
        );

    });
}


// ==============================
// LOAD REPLIES
// ==============================

async function loadReplies(postId, container) {

    if (!container) {
        return;
    }

    const response =
        await fetch(
            `/replies/${postId}`,
            {
                credentials: "same-origin"
            }
        );

    if (!response.ok) {
        return;
    }

    const replies =
        await response.json();

    container.innerHTML = "";


    replies.forEach(reply => {

        const replyElement =
            document.createElement("div");

        replyElement.className =
            "reply";


        // Reply profile picture

        const picture =
            document.createElement("div");

        picture.className =
            "reply-profile-picture";


        const replyName =
            reply.display_name ||
            reply.username ||
            "User";


        setProfilePicture(
            picture,
            reply.profile_picture,
            replyName
        );


        // Reply body

        const body =
            document.createElement("div");


        const username =
            document.createElement("strong");

        username.textContent =
            replyName;


        const usernameTag =
            document.createElement("small");

        usernameTag.textContent =
            ` @${reply.username}`;


        const content =
            document.createElement("p");

        content.textContent =
            reply.content;


        body.appendChild(username);
        body.appendChild(usernameTag);
        body.appendChild(content);


        replyElement.appendChild(picture);
        replyElement.appendChild(body);

        container.appendChild(replyElement);

    });
}


// ==============================
// LOAD LEADERBOARDS
// ==============================

async function loadLeaderboards() {

    const response =
        await fetch("/leaderboards", {
            credentials: "same-origin"
        });

    if (!response.ok) {
        return;
    }

    const data =
        await response.json();


    const likesContainer =
        document.querySelector(
            "#likesLeaderboard"
        );

    const postsContainer =
        document.querySelector(
            "#postsLeaderboard"
        );


    if (likesContainer) {

        likesContainer.innerHTML = "";


        data.mostLiked.forEach(
            (user, index) => {

                const item =
                    document.createElement("div");

                item.className =
                    "leaderboard-item";


                const picture =
                    document.createElement("div");

                picture.className =
                    "leaderboard-profile-picture";


                const name =
                    user.display_name ||
                    user.username ||
                    "User";


                setProfilePicture(
                    picture,
                    user.profile_picture,
                    name
                );


                const text =
                    document.createElement("span");

                text.textContent =
                    `${index + 1}. ${name} — 👍 ${user.likes}`;


                item.appendChild(picture);
                item.appendChild(text);

                likesContainer.appendChild(item);

            }
        );

    }


    if (postsContainer) {

        postsContainer.innerHTML = "";


        data.mostPosts.forEach(
            (user, index) => {

                const item =
                    document.createElement("div");

                item.className =
                    "leaderboard-item";


                const picture =
                    document.createElement("div");

                picture.className =
                    "leaderboard-profile-picture";


                const name =
                    user.display_name ||
                    user.username ||
                    "User";


                setProfilePicture(
                    picture,
                    user.profile_picture,
                    name
                );


                const text =
                    document.createElement("span");

                text.textContent =
                    `${index + 1}. ${name} — 📝 ${user.posts}`;


                item.appendChild(picture);
                item.appendChild(text);

                postsContainer.appendChild(item);

            }
        );

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
        async () => {

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
        await checkLogin();

    if (!loggedIn) {
        return;
    }

    await loadPosts();
    await loadLeaderboards();

}

start();