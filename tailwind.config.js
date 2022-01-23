module.exports = {
    separator: '_',
    mode: 'jit',
    // These paths are just examples, customize them to match your project structure
    content: ['./views/**/*.pug'],

    darkMode: 'media', // or 'media' or 'class'
    theme: {
        extend: {},
    },
    variants: {
        extend: {},
    },
    plugins: [require('@tailwindcss/forms')],
};
