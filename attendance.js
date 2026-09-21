// ==============================
// API HELPER
// ==============================

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            success: false,
            message: `Server error: ${response.status} ${response.statusText}`
        };
    }

    console.log(
        `API ${options.method || "GET"} ${url}`,
        response.status,
        data
    );

    if (!response.ok) {

        throw new Error(
            data.message ||
            `Request failed: ${response.status}`
        );
    }

    return data;
}


// ==============================
// LOAD STUDENTS
// ==============================

async function loadStudents() {

    const container =
        document.querySelector("#studentsContainer");

    const select =
        document.querySelector("#attendanceStudent");

    const studentCount =
        document.querySelector("#studentCount");

    if (!container || !select) {
        return;
    }

    try {

        container.innerHTML =
            "<p>Loading students...</p>";

        const students =
            await apiRequest("/attendance/students");

        console.log(
            "Students received:",
            students
        );

        if (studentCount) {
            studentCount.textContent =
                students.length;
        }

        if (!students.length) {

            container.innerHTML =
                "<p>No students registered yet.</p>";

            select.innerHTML =
                '<option value="">No students available</option>';

            return;
        }


        // ==============================
        // DISPLAY REGISTERED STUDENTS
        // ==============================

        container.innerHTML =
            students.map(student => `

                <div class="attendance-student">

                    <div class="student-info">

                        <strong>
                            ${escapeHTML(
                                student.student_name
                            )}
                        </strong>

                        <span>
                            ID:
                            ${escapeHTML(
                                student.student_id
                            )}
                        </span>

                    </div>

                    <button
                        type="button"
                        class="delete-student-button"
                        data-student-id="${student.id}"
                        data-student-name="${escapeHTML(
                            student.student_name
                        )}"
                    >
                        Delete
                    </button>

                </div>

            `).join("");


        // ==============================
        // DISPLAY STUDENTS IN DROPDOWN
        // ==============================

        select.innerHTML = `

            <option value="">
                Select Student
            </option>

            ${students.map(student => `

                <option value="${student.id}">
                    ${escapeHTML(
                        student.student_id
                    )}
                    -
                    ${escapeHTML(
                        student.student_name
                    )}
                </option>

            `).join("")}

        `;


        // ==============================
        // DELETE BUTTONS
        // ==============================

        const deleteButtons =
            document.querySelectorAll(
                ".delete-student-button"
            );

        deleteButtons.forEach(button => {

            button.addEventListener(
                "click",
                deleteStudent
            );

        });

    } catch (error) {

        console.error(
            "loadStudents ERROR:",
            error
        );

        container.innerHTML = `
            <p class="error-message">
                ${escapeHTML(error.message)}
            </p>
        `;

        select.innerHTML = `
            <option value="">
                Unable to load students
            </option>
        `;

        if (studentCount) {
            studentCount.textContent = "0";
        }
    }
}


// ==============================
// ADD STUDENT
// ==============================

async function addStudent(event) {

    event.preventDefault();

    const studentId =
        document
            .querySelector("#studentId")
            .value
            .trim();

    const studentName =
        document
            .querySelector("#studentName")
            .value
            .trim();

    if (!studentId || !studentName) {

        alert(
            "Please enter the student ID and name."
        );

        return;
    }

    try {

        const result =
            await apiRequest(
                "/attendance/students",
                {
                    method: "POST",

                    body: JSON.stringify({
                        student_id: studentId,
                        student_name: studentName
                    })
                }
            );

        alert(
            result.message ||
            "Student added successfully!"
        );

        document
            .querySelector("#studentForm")
            .reset();

        await loadStudents();

    } catch (error) {

        console.error(
            "addStudent ERROR:",
            error
        );

        alert(error.message);
    }
}


// ==============================
// DELETE STUDENT
// ==============================

async function deleteStudent(event) {

    const button =
        event.currentTarget;

    const studentId =
        button.dataset.studentId;

    const studentName =
        button.dataset.studentName;

    if (!studentId) {

        alert(
            "Unable to determine which student to delete."
        );

        return;
    }


    // ==============================
    // CONFIRM DELETION
    // ==============================

    const confirmed =
        confirm(
            `Are you sure you want to delete ${studentName}?\n\n` +
            `This will also delete all attendance records for this student.`
        );

    if (!confirmed) {
        return;
    }


    try {

        button.disabled = true;

        button.textContent =
            "Deleting...";


        // ==============================
        // DELETE STUDENT
        // ==============================

        const result =
            await apiRequest(
                `/attendance/students/${studentId}`,
                {
                    method: "DELETE"
                }
            );


        if (result.success === false) {

            throw new Error(
                result.message ||
                "Could not delete student."
            );
        }


        alert(
            result.message ||
            "Student deleted successfully."
        );


        // ==============================
        // REFRESH STUDENTS
        // ==============================

        await loadStudents();


        // ==============================
        // REFRESH ATTENDANCE
        // ==============================

        await loadAttendance();

        await loadTodayAttendance();


    } catch (error) {

        console.error(
            "deleteStudent ERROR:",
            error
        );

        alert(
            error.message ||
            "Could not delete student."
        );

        button.disabled = false;

        button.textContent =
            "Delete";
    }
}


// ==============================
// RECORD ATTENDANCE
// ==============================

async function recordAttendance(event) {

    event.preventDefault();

    const studentId =
        document
            .querySelector("#attendanceStudent")
            .value;

    const status =
        document
            .querySelector("#attendanceStatus")
            .value;

    if (!studentId || !status) {

        alert(
            "Please select a student and status."
        );

        return;
    }

    try {

        const result =
            await apiRequest(
                "/attendance",
                {
                    method: "POST",

                    body: JSON.stringify({
                        student_id:
                            Number(studentId),

                        status:
                            status
                    })
                }
            );

        alert(
            result.message ||
            "Attendance recorded successfully!"
        );

        document
            .querySelector("#attendanceForm")
            .reset();


        // Reload BOTH attendance sections

        await loadAttendance();

        await loadTodayAttendance();

    } catch (error) {

        console.error(
            "recordAttendance ERROR:",
            error
        );

        alert(error.message);
    }
}


// ==============================
// LOAD ALL ATTENDANCE
// ==============================

async function loadAttendance() {

    const container =
        document.querySelector(
            "#attendanceHistoryContainer"
        );

    if (!container) {
        return;
    }

    try {

        container.innerHTML =
            "<p>Loading attendance...</p>";

        const records =
            await apiRequest(
                "/attendance"
            );

        console.log(
            "All attendance received:",
            records
        );

        if (!records.length) {

            container.innerHTML =
                "<p>No attendance records yet.</p>";

            return;
        }

        container.innerHTML =
            createAttendanceTable(records);

    } catch (error) {

        console.error(
            "loadAttendance ERROR:",
            error
        );

        container.innerHTML = `
            <p class="error-message">
                ${escapeHTML(error.message)}
            </p>
        `;
    }
}


// ==============================
// LOAD TODAY'S ATTENDANCE
// ==============================

async function loadTodayAttendance() {

    const container =
        document.querySelector(
            "#todayAttendanceContainer"
        );

    if (!container) {
        return;
    }

    try {

        container.innerHTML =
            "<p>Loading today's attendance...</p>";

        const result =
            await apiRequest(
                "/attendance/today"
            );

        console.log(
            "Today's attendance received:",
            result
        );

        const records =
            result.records || [];

        if (!records.length) {

            container.innerHTML =
                "<p>No attendance has been recorded today.</p>";

            return;
        }

        container.innerHTML =
            createAttendanceTable(records);

    } catch (error) {

        console.error(
            "loadTodayAttendance ERROR:",
            error
        );

        container.innerHTML = `
            <p class="error-message">
                ${escapeHTML(error.message)}
            </p>
        `;
    }
}


// ==============================
// SEARCH ATTENDANCE BY DATE
// ==============================

async function searchAttendanceByDate() {

    const dateInput =
        document.querySelector(
            "#attendanceDate"
        );

    const container =
        document.querySelector(
            "#attendanceHistoryContainer"
        );

    if (!dateInput || !container) {
        return;
    }

    const selectedDate =
        dateInput.value;

    if (!selectedDate) {

        alert(
            "Please select a date."
        );

        return;
    }

    try {

        const result =
            await apiRequest(
                `/attendance/date/${selectedDate}`
            );

        const records =
            result.records || [];

        if (!records.length) {

            container.innerHTML = `
                <p>
                    No attendance records found for
                    <strong>
                        ${escapeHTML(selectedDate)}
                    </strong>.
                </p>
            `;

            return;
        }

        container.innerHTML =
            createAttendanceTable(records);

    } catch (error) {

        console.error(
            "searchAttendanceByDate ERROR:",
            error
        );

        container.innerHTML = `
            <p class="error-message">
                ${escapeHTML(error.message)}
            </p>
        `;
    }
}


// ==============================
// SHOW ALL ATTENDANCE
// ==============================

async function showAllAttendance() {

    await loadAttendance();
}


// ==============================
// CREATE ATTENDANCE TABLE
// ==============================

function createAttendanceTable(records) {

    return `

        <div class="attendance-table-wrapper">

            <table class="attendance-table">

                <thead>

                    <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                    </tr>

                </thead>

                <tbody>

                    ${records.map(record => `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    record.student_id
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    record.student_name
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    record.attendance_date
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    record.attendance_time
                                )}
                            </td>

                            <td>

                                <span
                                    class="attendance-status ${String(
                                        record.status
                                    ).toLowerCase()}"
                                >
                                    ${escapeHTML(
                                        record.status
                                    )}
                                </span>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;
}


// ==============================
// LOGOUT
// ==============================

async function logout() {

    try {

        await apiRequest(
            "/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        window.location.href =
            "index.html";
    }
}


// ==============================
// ESCAPE HTML
// ==============================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// ==============================
// SHOW TODAY'S DATE
// ==============================

function showTodayDate() {

    const dateElement =
        document.querySelector(
            "#todayDate"
        );

    if (!dateElement) {
        return;
    }

    const today =
        new Date();

    dateElement.textContent =
        today.toLocaleDateString(
            "en-US",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


// ==============================
// EVENT LISTENERS
// ==============================

const studentForm =
    document.querySelector(
        "#studentForm"
    );

if (studentForm) {

    studentForm.addEventListener(
        "submit",
        addStudent
    );
}


const attendanceForm =
    document.querySelector(
        "#attendanceForm"
    );

if (attendanceForm) {

    attendanceForm.addEventListener(
        "submit",
        recordAttendance
    );
}


const logoutButton =
    document.querySelector(
        "#logoutButton"
    );

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );
}


const searchButton =
    document.querySelector(
        "#searchAttendanceButton"
    );

if (searchButton) {

    searchButton.addEventListener(
        "click",
        searchAttendanceByDate
    );
}


const showAllButton =
    document.querySelector(
        "#showAllAttendanceButton"
    );

if (showAllButton) {

    showAllButton.addEventListener(
        "click",
        showAllAttendance
    );
}


// ==============================
// INITIAL LOAD
// ==============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        showTodayDate();

        loadStudents();

        loadAttendance();

        loadTodayAttendance();

    }
);