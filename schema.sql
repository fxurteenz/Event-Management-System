CREATE TABLE Faculties (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Majors (
    major_id INT AUTO_INCREMENT PRIMARY KEY,
    major_name VARCHAR(255) NOT NULL,
    faculty_id INT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES Faculties(faculty_id) ON DELETE CASCADE
);

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'club_president', 'org_president', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Students (
    student_id VARCHAR(20) PRIMARY KEY, -- e.g. student ID number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    major_id INT NOT NULL,
    user_id INT NOT NULL,
    accumulated_hours DECIMAL(5, 2) DEFAULT 0.00,
    FOREIGN KEY (major_id) REFERENCES Majors(major_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Activity_Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    activity_hours DECIMAL(5, 2) NOT NULL,
    qr_code_data VARCHAR(255) UNIQUE,
    created_by INT NOT NULL, -- references Users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Activity_Categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE TABLE Activity_Registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    status ENUM('registered', 'cancelled', 'confirmed') DEFAULT 'registered',
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    UNIQUE(activity_id, student_id)
);

CREATE TABLE Announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published_date DATETIME NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Insert Initial Admin User (Password: admin123, you will need to hash this in real app, assuming bcrypt or similar)
-- For this setup, let's just put plain text or a dummy hash for now. 
-- In API we should use bcrypt.
