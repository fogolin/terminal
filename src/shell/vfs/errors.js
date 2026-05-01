class NotFoundError extends Error {
    constructor(path) {
        super(`${path}: No such file or directory`);
        this.name = 'NotFoundError';
        this.code = 'ENOENT';
    }
}

class PermissionError extends Error {
    constructor(path) {
        super(`${path}: Permission denied`);
        this.name = 'PermissionError';
        this.code = 'EACCES';
    }
}

class NotDirectoryError extends Error {
    constructor(path) {
        super(`${path}: Not a directory`);
        this.name = 'NotDirectoryError';
        this.code = 'ENOTDIR';
    }
}

class AlreadyExistsError extends Error {
    constructor(path) {
        super(`${path}: File exists`);
        this.name = 'AlreadyExistsError';
        this.code = 'EEXIST';
    }
}

class IsDirectoryError extends Error {
    constructor(path) {
        super(`${path}: Is a directory`);
        this.name = 'IsDirectoryError';
        this.code = 'EISDIR';
    }
}

export { NotFoundError, PermissionError, NotDirectoryError, AlreadyExistsError, IsDirectoryError };
