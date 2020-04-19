'use strict';
// Initialize needed modules
const fs    =    require('fs');
const path  =    require('path');

// Initialize directories
const rawPath       =   'convertjs';
const directoryPath =   path.join(__dirname, rawPath);


// Start scanning files for js and directories
scanFiles(`${directoryPath}`);

function scanFiles(dirpath){
    // read directory
    const files = fs.readdirSync(dirpath);
    files.forEach(file => {
        const fileRawPath = `${dirpath}\\${file}`;
        // if detected item is a directory then recurse and scan for js or directories
        // otherwise, if file is js, start converting
        if(fs.lstatSync(fileRawPath).isDirectory()) {
            scanFiles(fileRawPath); // recurse
        } else if(path.extname(file) === '.js') {
            convertJS(fileRawPath);
        }
    });
}


/**
 * @function converJS converts the JS file, start by transpiling with babel then obfuscate with javascript-obfuscate
 * @param {string} fileRawPath String representation of the raw js files
 */
function convertJS(fileRawPath) {
    const fileSavePath = fileRawPath.replace(`\\${rawPath}`, ''); // Get save path base on the raw file
    const fileRawMdate = fs.statSync(fileRawPath).mtime; // Get modified time of raw file
    const fileOutMdate = fs.existsSync(fileSavePath) ? fs.statSync(fileSavePath).mtime : fileRawMdate-1; // Get modifed time of save path
    const hasChanges = fileRawMdate > fileOutMdate; // Check if updated, raw file vs output file
    const fileTranspiledPath = fileRawPath + '.transpiled'; // Save transpiled file temporarily
    
    // check for node command arguments '-f' that forces convertion of js
    let isForced = false;
    if(process.argv.length > 2) {
        if(process.argv[2] == '-f') isForced = true;
    }

    if(hasChanges || isForced) {
        const process = async () => {
            try {
                // transpile file
                const transpile = await transpileCode(fileRawPath, fileTranspiledPath);
                console.log('\x1b[36m%s\x1b[0m',fileSavePath, ':    ', transpile);

                // obfuscate the transpiled file
                const obfuscate = await obfuscateCode(fileTranspiledPath, fileSavePath);
                console.log('\x1b[36m%s\x1b[0m', fileSavePath, ':    ', obfuscate);
            } catch(e){
                console.log('\x1b[31m%s\x1b[0m', fileSavePath, ':   ', e);
            }
            // Removes transpiled file
            fs.unlinkSync(fileTranspiledPath);
        };

        // start the above async function
        process();
    } else {
        console.log('\x1b[35m%s\x1b[0m', fileSavePath, ':    [no changes]');
    }

}


/**
 * @function transpileCode Traspiles the code using bable 
 * @param {string} file_raw file location of the raw js
 * @param {string} file_save file location of the output transpiled js
 * @returns {Promise<string>} result, failed or success
*/
function transpileCode(file_raw, file_save) {
    const babel = require('@babel/core');
    
    return new Promise((resolve, reject) => {
        try {
            const code = fs.readFileSync(file_raw, 'UTF-8',);
            const transpiledResult = babel.transform(code, {
                // modify here if you want to use custom options
                minified: true,
                compact: true,
                comments: false,
                presets: [
                    [
                      '@babel/preset-env', {
                            targets: {
                                esmodules: true,
                            }
                      },
                    ],
                ],
                plugins: ['remove-use-strict'],
            }).code;
            const writeResult = fs.writeFileSync(file_save, transpiledResult); 
            resolve('[transpile success]');
        } catch(e) {
            reject('[transpile failed]    -   ' + e);
        }
    });
}

/**
 * @function obfuscateCode Obfuscate the code using javascript-obfuscator 
 * @param {string} file_raw file location of the raw js
 * @param {string} file_save file location of the output final js
 * @returns {Promise<string>} result, failed or success
*/
function obfuscateCode(file_raw, file_save){
    const JavaScriptObfuscator = require('javascript-obfuscator');

    // get output path without the js file
    let dir_save = file_save.split('\\');
    dir_save.pop();
    dir_save = dir_save.join('\\');
    
    return new Promise((resolve, reject) => {
        try {
            const code = fs.readFileSync(file_raw, 'UTF-8');
            const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
                // insert your custom options here
            }).getObfuscatedCode();
            
            // check if path exist, create if not
            if(!fs.existsSync(dir_save)) fs.mkdirSync(dir_save,{ recursive: true });
            
            const writeResult = fs.writeFileSync(file_save, obfuscationResult);
            resolve('[obfuscate success]');
        } catch(e) {
            reject('[obfuscate failed]    -   ' + e);
        }
    });
}