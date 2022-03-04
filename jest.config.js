module.exports = {
    "transform": {
        "^.+\\.[t|j]sx?$": "babel-jest"
    },
    "moduleNameMapper": {
        "^@/(.*)$": "<rootDir>/src/$1"
    }
}