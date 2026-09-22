const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// 1. Tell Express where to find your static assets (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Handle the homepage route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
    // Adjust 'public' and 'index.html' to match your actual folder structure
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const PORT = 3000;

const ADMIN_EMAIL = "newadminr@test.com";

// ============================================================
// DATABASE
// ============================================================

const db = new Database("users.db");


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

app.use(session({
    secret: "change-this-to-a-long-random-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));


// ============================================================
// CREATE TABLES
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);


// ============================================================
// ATTENDANCE TABLES
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL UNIQUE,
        student_name TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        student_id INTEGER NOT NULL,

        attendance_date TEXT NOT NULL,

        attendance_time TEXT NOT NULL,

        status TEXT NOT NULL
            CHECK(status IN ('PRESENT', 'LATE', 'ABSENT')),

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(student_id, attendance_date),

        FOREIGN KEY (student_id)
            REFERENCES students(id)
    )
`);


// ============================================================
// PROFILE COLUMNS
// ============================================================

try {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN display_name TEXT DEFAULT ''
    `);
} catch (error) {
    // Column already exists
}

try {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN bio TEXT DEFAULT ''
    `);
} catch (error) {
    // Column already exists
}

try {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN profile_picture TEXT DEFAULT ''
    `);
} catch (error) {
    // Column already exists
}


console.log("Database is ready!");


// ============================================================
// ADMIN CHECK
// ============================================================

function requireAdmin(req, res, next) {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    const user = db.prepare(`
        SELECT
            id,
            username,
            email
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "User not found."
        });
    }

    if (user.email !== ADMIN_EMAIL) {

        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });
    }

    next();
}


// ============================================================
// PROTECT DASHBOARD
// ============================================================

app.use((req, res, next) => {

    if (req.path === "/dashboard.html") {

        if (!req.session.userId) {

            return res.redirect("/auth.html");
        }
    }

    next();
});


// ============================================================
// SERVE WEBSITE
// ============================================================

app.use(express.static("public"));


// ============================================================
// SIGN UP
// ============================================================

app.post("/signup", async (req, res) => {

    const {
        username,
        email,
        password
    } = req.body;

    if (!username || !email || !password) {

        return res.json({
            success: false,
            message: "Please fill in all fields."
        });
    }

    try {

        const cleanUsername =
            String(username).trim();

        const cleanEmail =
            String(email).trim().toLowerCase();

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users
            (
                username,
                email,
                password,
                display_name,
                bio,
                profile_picture
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            cleanUsername,
            cleanEmail,
            hashedPassword,
            cleanUsername,
            "",
            ""
        );

        res.json({
            success: true,
            message: "Account created successfully!"
        });

    } catch (error) {

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {

            return res.json({
                success: false,
                message: "That email is already registered."
            });
        }

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong."
        });
    }
});


// ============================================================
// LOGIN
// ============================================================

app.post("/login", async (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {

        return res.json({
            success: false,
            message: "Please enter your email and password."
        });
    }

    const user = db.prepare(`
        SELECT *
        FROM users
        WHERE email = ?
    `).get(
        String(email).trim().toLowerCase()
    );

    if (!user) {

        return res.json({
            success: false,
            message: "Invalid email or password."
        });
    }

    const passwordMatch =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!passwordMatch) {

        return res.json({
            success: false,
            message: "Invalid email or password."
        });
    }

    req.session.userId =
        user.id;

    req.session.username =
        user.username;

    res.json({
        success: true,
        message:
            `Welcome back, ${user.username}!`
    });
});


// ============================================================
// CURRENT USER
// ============================================================

app.get("/me", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.json({
            loggedIn: false
        });
    }

    const user = db.prepare(`
        SELECT
            id,
            username,
            email,
            display_name,
            bio,
            profile_picture
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {

        return res.json({
            loggedIn: false
        });
    }

    const postCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM posts
        WHERE user_id = ?
    `).get(req.session.userId);

    const likesReceived = db.prepare(`
        SELECT COUNT(likes.id) AS count
        FROM likes
        JOIN posts
            ON likes.post_id = posts.id
        WHERE posts.user_id = ?
    `).get(req.session.userId);

    const isAdmin =
        user.email === ADMIN_EMAIL;

    res.json({
        loggedIn: true,
        userId: user.id,
        username: user.username,
        email: user.email,
        display_name:
            user.display_name || user.username,
        bio:
            user.bio || "",
        profile_picture:
            user.profile_picture || "",
        postCount:
            postCount.count,
        likesReceived:
            likesReceived.count,
        isAdmin
    });
});


// ============================================================
// GET PROFILE
// ============================================================

app.get("/profile", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    const user = db.prepare(`
        SELECT
            id,
            username,
            email,
            display_name,
            bio,
            profile_picture
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {

        return res.status(404).json({
            success: false,
            message: "User not found."
        });
    }

    const postCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM posts
        WHERE user_id = ?
    `).get(req.session.userId);

    const likesReceived = db.prepare(`
        SELECT COUNT(likes.id) AS count
        FROM likes
        JOIN posts
            ON likes.post_id = posts.id
        WHERE posts.user_id = ?
    `).get(req.session.userId);

    res.json({
        username: user.username,
        email: user.email,
        display_name:
            user.display_name || user.username,
        bio:
            user.bio || "",
        profile_picture:
            user.profile_picture || "",
        postCount:
            postCount.count,
        likesReceived:
            likesReceived.count
    });
});


// ============================================================
// UPDATE PROFILE
// ============================================================

app.put("/profile", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    let {
        display_name,
        bio,
        profile_picture
    } = req.body;

    display_name =
        String(display_name || "").trim();

    bio =
        String(bio || "").trim();

    profile_picture =
        String(profile_picture || "").trim();

    if (!display_name) {

        return res.json({
            success: false,
            message:
                "Display name cannot be empty."
        });
    }

    if (display_name.length > 30) {

        return res.json({
            success: false,
            message:
                "Display name must be 30 characters or less."
        });
    }

    if (bio.length > 300) {

        return res.json({
            success: false,
            message:
                "About Me must be 300 characters or less."
        });
    }

    if (profile_picture.length > 100000000) {

        return res.json({
            success: false,
            message:
                "Profile picture URL is too long."
        });
    }

    db.prepare(`
        UPDATE users
        SET
            display_name = ?,
            bio = ?,
            profile_picture = ?
        WHERE id = ?
    `).run(
        display_name,
        bio,
        profile_picture,
        req.session.userId
    );

    res.json({
        success: true,
        message:
            "Profile updated successfully!"
    });
});


// ============================================================
// CREATE POST
// ============================================================

app.post("/posts", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    const {
        content
    } = req.body;

    if (!content || content.trim() === "") {

        return res.json({
            success: false,
            message:
                "Post cannot be empty."
        });
    }

    db.prepare(`
        INSERT INTO posts
        (user_id, content)
        VALUES (?, ?)
    `).run(
        req.session.userId,
        content.trim()
    );

    res.json({
        success: true,
        message: "Post created!"
    });
});


// ============================================================
// GET POSTS
// ============================================================

app.get("/posts", (req, res) => {

    const posts = db.prepare(`
        SELECT
            posts.id,
            posts.content,
            posts.created_at,
            users.username,
            users.display_name,
            users.profile_picture,
            COUNT(likes.id) AS like_count
        FROM posts
        JOIN users
            ON posts.user_id = users.id
        LEFT JOIN likes
            ON posts.id = likes.post_id
        GROUP BY posts.id
        ORDER BY posts.created_at DESC
    `).all();

    res.json(posts);
});


// ============================================================
// CREATE REPLY
// ============================================================

app.post("/replies", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    const {
        postId,
        content
    } = req.body;

    if (!content || content.trim() === "") {

        return res.json({
            success: false,
            message:
                "Reply cannot be empty."
        });
    }

    const post = db.prepare(`
        SELECT id
        FROM posts
        WHERE id = ?
    `).get(postId);

    if (!post) {

        return res.json({
            success: false,
            message:
                "Post does not exist."
        });
    }

    db.prepare(`
        INSERT INTO replies
        (post_id, user_id, content)
        VALUES (?, ?, ?)
    `).run(
        postId,
        req.session.userId,
        content.trim()
    );

    res.json({
        success: true,
        message: "Reply posted!"
    });
});


// ============================================================
// GET REPLIES
// ============================================================

app.get("/replies/:postId", (req, res) => {

    const replies = db.prepare(`
        SELECT
            replies.id,
            replies.content,
            replies.created_at,
            users.username,
            users.display_name,
            users.profile_picture
        FROM replies
        JOIN users
            ON replies.user_id = users.id
        WHERE replies.post_id = ?
        ORDER BY replies.created_at ASC
    `).all(req.params.postId);

    res.json(replies);
});


// ============================================================
// LIKE / UNLIKE
// ============================================================

app.post("/posts/:postId/like", (req, res) => {

    if (!req.session || !req.session.userId) {

        return res.status(401).json({
            success: false,
            message:
                "You must be logged in."
        });
    }

    const postId =
        req.params.postId;

    const userId =
        req.session.userId;

    const post = db.prepare(`
        SELECT id
        FROM posts
        WHERE id = ?
    `).get(postId);

    if (!post) {

        return res.status(404).json({
            success: false,
            message:
                "Post not found."
        });
    }

    const existingLike = db.prepare(`
        SELECT id
        FROM likes
        WHERE post_id = ?
        AND user_id = ?
    `).get(
        postId,
        userId
    );

    if (existingLike) {

        db.prepare(`
            DELETE FROM likes
            WHERE post_id = ?
            AND user_id = ?
        `).run(
            postId,
            userId
        );

        return res.json({
            success: true,
            liked: false
        });
    }

    db.prepare(`
        INSERT INTO likes
        (post_id, user_id)
        VALUES (?, ?)
    `).run(
        postId,
        userId
    );

    res.json({
        success: true,
        liked: true
    });
});


// ============================================================
// LEADERBOARDS
// ============================================================

app.get("/leaderboards", (req, res) => {

    const mostLiked = db.prepare(`
        SELECT
            users.username,
            users.display_name,
            users.profile_picture,
            COUNT(likes.id) AS likes
        FROM users
        LEFT JOIN posts
            ON users.id = posts.user_id
        LEFT JOIN likes
            ON posts.id = likes.post_id
        GROUP BY users.id
        ORDER BY likes DESC
        LIMIT 10
    `).all();

    const mostPosts = db.prepare(`
        SELECT
            users.username,
            users.display_name,
            users.profile_picture,
            COUNT(posts.id) AS posts
        FROM users
        LEFT JOIN posts
            ON users.id = posts.user_id
        GROUP BY users.id
        ORDER BY posts DESC
        LIMIT 10
    `).all();

    res.json({
        mostLiked,
        mostPosts
    });
});


// ============================================================
// ADMIN - USERS
// ============================================================

app.get("/admin/users", requireAdmin, (req, res) => {

    const users = db.prepare(`
        SELECT
            users.id,
            users.username,
            users.email,
            users.display_name,
            users.bio,
            users.profile_picture,
            COUNT(DISTINCT posts.id) AS post_count,
            COUNT(DISTINCT likes.id) AS likes_received
        FROM users
        LEFT JOIN posts
            ON users.id = posts.user_id
        LEFT JOIN likes
            ON posts.id = likes.post_id
        GROUP BY users.id
        ORDER BY users.id DESC
    `).all();

    res.json(users);
});


// ============================================================
// ADMIN - POSTS
// ============================================================

app.get("/admin/posts", requireAdmin, (req, res) => {

    const posts = db.prepare(`
        SELECT
            posts.id,
            posts.content,
            posts.created_at,
            users.username,
            users.display_name,
            users.profile_picture,
            COUNT(likes.id) AS like_count
        FROM posts
        JOIN users
            ON posts.user_id = users.id
        LEFT JOIN likes
            ON posts.id = likes.post_id
        GROUP BY posts.id
        ORDER BY posts.created_at DESC
    `).all();

    res.json(posts);
});


// ============================================================
// ADMIN - DELETE POST
// ============================================================

app.delete(
    "/admin/posts/:postId",
    requireAdmin,
    (req, res) => {

        const postId =
            req.params.postId;

        const post = db.prepare(`
            SELECT id
            FROM posts
            WHERE id = ?
        `).get(postId);

        if (!post) {

            return res.status(404).json({
                success: false,
                message:
                    "Post not found."
            });
        }

        db.prepare(`
            DELETE FROM likes
            WHERE post_id = ?
        `).run(postId);

        db.prepare(`
            DELETE FROM replies
            WHERE post_id = ?
        `).run(postId);

        db.prepare(`
            DELETE FROM posts
            WHERE id = ?
        `).run(postId);

        res.json({
            success: true,
            message: "Post deleted."
        });
    }
);


// ============================================================
// ATTENDANCE SYSTEM
// ============================================================


// ============================================================
// GET ALL STUDENTS
// ============================================================

app.get(
    "/attendance/students",
    requireAdmin,
    (req, res) => {

        try {

            const students = db.prepare(`
                SELECT
                    id,
                    student_id,
                    student_name
                FROM students
                ORDER BY student_name ASC
            `).all();

            res.json(students);

        } catch (error) {

            console.error(
                "LOAD STUDENTS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load students."
            });
        }
    }
);


// ============================================================
// ADD STUDENT
// ============================================================

app.post(
    "/attendance/students",
    requireAdmin,
    (req, res) => {

        const {
            student_id,
            student_name
        } = req.body;

        if (!student_id || !student_name) {

            return res.json({
                success: false,
                message:
                    "Student ID and student name are required."
            });
        }

        const cleanStudentId =
            String(student_id).trim();

        const cleanStudentName =
            String(student_name).trim();

        if (
            !cleanStudentId ||
            !cleanStudentName
        ) {

            return res.json({
                success: false,
                message:
                    "Student ID and student name cannot be empty."
            });
        }

        try {

            db.prepare(`
                INSERT INTO students
                (
                    student_id,
                    student_name
                )
                VALUES (?, ?)
            `).run(
                cleanStudentId,
                cleanStudentName
            );

            res.json({
                success: true,
                message:
                    "Student added successfully."
            });

        } catch (error) {

            console.error(
                "ADD STUDENT ERROR:",
                error
            );

            if (
                error.code ===
                "SQLITE_CONSTRAINT_UNIQUE"
            ) {

                return res.json({
                    success: false,
                    message:
                        "That Student ID already exists."
                });
            }

            res.status(500).json({
                success: false,
                message:
                    "Could not add student."
            });
        }
    }
);


// ============================================================
// DELETE STUDENT
// ============================================================

app.delete(
    "/attendance/students/:studentId",
    requireAdmin,
    (req, res) => {

        const studentId =
            req.params.studentId;

        const student = db.prepare(`
            SELECT
                id,
                student_id,
                student_name
            FROM students
            WHERE id = ?
        `).get(studentId);

        if (!student) {

            return res.status(404).json({
                success: false,
                message:
                    "Student not found."
            });
        }

        try {

            db.prepare(`
                DELETE FROM attendance
                WHERE student_id = ?
            `).run(student.id);

            db.prepare(`
                DELETE FROM students
                WHERE id = ?
            `).run(student.id);

            res.json({
                success: true,
                message:
                    `${student.student_name} has been deleted.`
            });

        } catch (error) {

            console.error(
                "DELETE STUDENT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not delete student."
            });
        }
    }
);


// ============================================================
// SERVER DATE HELPER
// ============================================================

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ============================================================
// SERVER TIME HELPER
// ============================================================

function getCurrentTime() {

    const now = new Date();

    const hours =
        String(now.getHours())
            .padStart(2, "0");

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}


// ============================================================
// RECORD / UPDATE ATTENDANCE
// ============================================================

app.post(
    "/attendance",
    requireAdmin,
    (req, res) => {

        const {
            student_id,
            status
        } = req.body;

        if (!student_id || !status) {

            return res.json({
                success: false,
                message:
                    "Student and attendance status are required."
            });
        }

        const allowedStatuses = [
            "PRESENT",
            "LATE",
            "ABSENT"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.json({
                success: false,
                message:
                    "Invalid attendance status."
            });
        }

        const student = db.prepare(`
            SELECT
                id,
                student_id,
                student_name
            FROM students
            WHERE id = ?
        `).get(student_id);

        if (!student) {

            return res.json({
                success: false,
                message:
                    "Student not found."
            });
        }

        const attendanceDate =
            getTodayDate();

        const attendanceTime =
            getCurrentTime();

        try {

            const existingAttendance =
                db.prepare(`
                    SELECT id
                    FROM attendance
                    WHERE student_id = ?
                    AND attendance_date = ?
                `).get(
                    student.id,
                    attendanceDate
                );

            // UPDATE EXISTING RECORD

            if (existingAttendance) {

                db.prepare(`
                    UPDATE attendance
                    SET
                        status = ?,
                        attendance_time = ?
                    WHERE id = ?
                `).run(
                    status,
                    attendanceTime,
                    existingAttendance.id
                );

                return res.json({
                    success: true,
                    updated: true,
                    message:
                        "Today's attendance was updated successfully."
                });
            }

            // CREATE NEW RECORD

            db.prepare(`
                INSERT INTO attendance
                (
                    student_id,
                    attendance_date,
                    attendance_time,
                    status
                )
                VALUES (?, ?, ?, ?)
            `).run(
                student.id,
                attendanceDate,
                attendanceTime,
                status
            );

            res.json({
                success: true,
                updated: false,
                message:
                    "Today's attendance was saved successfully."
            });

        } catch (error) {

            console.error(
                "RECORD ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not save attendance."
            });
        }
    }
);


// ============================================================
// GET ALL ATTENDANCE
// ============================================================

app.get(
    "/attendance",
    requireAdmin,
    (req, res) => {

        try {

            const records = db.prepare(`
                SELECT
                    attendance.id,
                    students.student_id,
                    students.student_name,
                    attendance.attendance_date,
                    attendance.attendance_time,
                    attendance.status
                FROM attendance
                JOIN students
                    ON attendance.student_id = students.id
                ORDER BY
                    attendance.attendance_date DESC,
                    attendance.attendance_time DESC,
                    students.student_name ASC
            `).all();

            res.json(records);

        } catch (error) {

            console.error(
                "LOAD ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load attendance."
            });
        }
    }
);


// ============================================================
// GET TODAY'S ATTENDANCE
// ============================================================

app.get(
    "/attendance/today",
    requireAdmin,
    (req, res) => {

        const today =
            getTodayDate();

        try {

            const records = db.prepare(`
                SELECT
                    attendance.id,
                    students.student_id,
                    students.student_name,
                    attendance.attendance_date,
                    attendance.attendance_time,
                    attendance.status
                FROM attendance
                JOIN students
                    ON attendance.student_id = students.id
                WHERE attendance.attendance_date = ?
                ORDER BY students.student_name ASC
            `).all(today);

            res.json({
                success: true,
                date: today,
                records
            });

        } catch (error) {

            console.error(
                "LOAD TODAY ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load today's attendance."
            });
        }
    }
);


// ============================================================
// GET ATTENDANCE FOR SPECIFIC DATE
// ============================================================

app.get(
    "/attendance/date/:date",
    requireAdmin,
    (req, res) => {

        const requestedDate =
            req.params.date;

        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(requestedDate)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid date format. Use YYYY-MM-DD."
            });
        }

        try {

            const records = db.prepare(`
                SELECT
                    attendance.id,
                    students.student_id,
                    students.student_name,
                    attendance.attendance_date,
                    attendance.attendance_time,
                    attendance.status
                FROM attendance
                JOIN students
                    ON attendance.student_id = students.id
                WHERE attendance.attendance_date = ?
                ORDER BY students.student_name ASC
            `).all(requestedDate);

            res.json({
                success: true,
                date: requestedDate,
                records
            });

        } catch (error) {

            console.error(
                "SEARCH ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not search attendance."
            });
        }
    }
);


// ============================================================
// DELETE ATTENDANCE RECORD
// ============================================================

app.delete(
    "/attendance/:attendanceId",
    requireAdmin,
    (req, res) => {

        const attendanceId =
            req.params.attendanceId;

        const record = db.prepare(`
            SELECT id
            FROM attendance
            WHERE id = ?
        `).get(attendanceId);

        if (!record) {

            return res.status(404).json({
                success: false,
                message:
                    "Attendance record not found."
            });
        }

        try {

            db.prepare(`
                DELETE FROM attendance
                WHERE id = ?
            `).run(attendanceId);

            res.json({
                success: true,
                message:
                    "Attendance record deleted."
            });

        } catch (error) {

            console.error(
                "DELETE ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not delete attendance record."
            });
        }
    }
);


// ============================================================
// LOGOUT
// ============================================================

app.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            return res.status(500).json({
                success: false,
                message:
                    "Could not log out."
            });
        }

        res.json({
            success: true,
            message:
                "Logged out successfully."
        });
    });
});



// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
