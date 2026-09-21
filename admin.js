async function loadUsers() {

    const response = await fetch("/admin/users", {
        credentials: "same-origin"
    });

    if (!response.ok) {
        document.querySelector("#usersContainer").innerHTML =
            "<p>You do not have administrator access.</p>";

        return;
    }

    const users = await response.json();

    const container = document.querySelector("#usersContainer");

    if (users.length === 0) {
        container.innerHTML = "<p>No users found.</p>";
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="admin-user">

            <div>
                <strong>${escapeHTML(user.username)}</strong>
                <p>${escapeHTML(user.email)}</p>
            </div>

            <div class="admin-user-stats">
                <span>Posts: ${user.post_count}</span>
                <span>Likes: ${user.likes_received}</span>
            </div>

        </div>
    `).join("");
}


async function loadPosts() {

    const response = await fetch("/admin/posts", {
        credentials: "same-origin"
    });

    if (!response.ok) {
        document.querySelector("#postsContainer").innerHTML =
            "<p>Unable to load posts.</p>";

        return;
    }

    const posts = await response.json();

    const container = document.querySelector("#postsContainer");

    if (posts.length === 0) {
        container.innerHTML = "<p>No posts found.</p>";
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="admin-post">

            <div class="admin-post-header">

                <strong>
                    ${escapeHTML(post.username)}
                </strong>

                <span>
                    ❤️ ${post.like_count}
                </span>

            </div>

            <p class="admin-post-content">
                ${escapeHTML(post.content)}
            </p>

            <small>
                ${post.created_at}
            </small>

            <br>

            <button
                class="delete-post-button"
                onclick="deletePost(${post.id})"
            >
                Delete Post
            </button>

        </div>
    `).join("");
}


async function deletePost(postId) {

    const confirmed = confirm(
        "Are you sure you want to delete this post?"
    );

    if (!confirmed) {
        return;
    }

    const response = await fetch(
        `/admin/posts/${postId}`,
        {
            method: "DELETE",
            credentials: "same-origin"
        }
    );

    const result = await response.json();

    if (!result.success) {
        alert(result.message);
        return;
    }

    await loadPosts();
    await loadUsers();
}


async function logout() {

    await fetch("/logout", {
        method: "POST",
        credentials: "same-origin"
    });

    window.location.href = "index.html";
}


document
    .querySelector("#logoutButton")
    .addEventListener("click", logout);


// Prevent HTML entered by users from becoming actual HTML
function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


loadUsers();
loadPosts();