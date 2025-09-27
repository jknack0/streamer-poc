module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    collectCoverageFrom: [
        'controllers/**/*.js',
        'db/**/*.js',
        'routes/**/*.js',
        'sockets/**/*.js',
        'index.js'
    ]
};
