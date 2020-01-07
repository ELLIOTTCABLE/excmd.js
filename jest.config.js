module.exports = {
   projects: ["<rootDir>/packages/*"],
   transform: {'\\.js$': ['babel-jest', {rootMode: 'upward'}]},
}
