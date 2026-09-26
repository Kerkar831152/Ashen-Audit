import {
    execFile
} from 'child_process';

import {
    promisify
} from 'util';

import {
    mkdtemp,
    writeFile,
    rm
} from 'fs/promises';

import * as os from 'os';

import * as path from 'path';


const execFileAsync =
    promisify(
        execFile
    );


export type ValidationStatus =
    | 'passed'
    | 'failed'
    | 'unavailable';


export interface ValidationResult {

    status:
        ValidationStatus;

    language:
        string;

    compiler:
        string;

    output:
        string;
}


interface CompilerConfig {

    command:
        string;

    args:
        (filePath: string) => string[];

    name:
        string;

    extension:
        string;
}


const compilerOptions:
    Record<
        string,
        CompilerConfig[]
    > = {

    cpp: [

        {
            command:
                'g++',

            args:
                filePath => [
                    '-std=c++17',
                    '-fsyntax-only',
                    filePath
                ],

            name:
                'g++',

            extension:
                '.cpp'
        },

        {
            command:
                'clang++',

            args:
                filePath => [
                    '-std=c++17',
                    '-fsyntax-only',
                    filePath
                ],

            name:
                'clang++',

            extension:
                '.cpp'
        },

        {
            command:
                'cl.exe',

            args:
                filePath => [
                    '/nologo',
                    '/std:c++17',
                    '/Zs',
                    filePath
                ],

            name:
                'Microsoft C++ compiler',

            extension:
                '.cpp'
        }
    ],


    c: [

        {
            command:
                'gcc',

            args:
                filePath => [
                    '-std=c17',
                    '-fsyntax-only',
                    filePath
                ],

            name:
                'gcc',

            extension:
                '.c'
        },

        {
            command:
                'clang',

            args:
                filePath => [
                    '-std=c17',
                    '-fsyntax-only',
                    filePath
                ],

            name:
                'clang',

            extension:
                '.c'
        },

        {
            command:
                'cl.exe',

            args:
                filePath => [
                    '/nologo',
                    '/TC',
                    '/Zs',
                    filePath
                ],

            name:
                'Microsoft C compiler',

            extension:
                '.c'
        }
    ],


    javascript: [

        {
            command:
                'node',

            args:
                filePath => [
                    '--check',
                    filePath
                ],

            name:
                'Node.js',

            extension:
                '.js'
        }
    ],


    typescript: [

        {
            command:
                process.platform ===
                'win32'
                    ? 'tsc.cmd'
                    : 'tsc',

            args:
                filePath => [
                    '--noEmit',
                    '--skipLibCheck',
                    filePath
                ],

            name:
                'TypeScript compiler',

            extension:
                '.ts'
        }
    ],


    python: [

        {
            command:
                process.platform ===
                'win32'
                    ? 'python'
                    : 'python3',

            args:
                filePath => [
                    '-m',
                    'py_compile',
                    filePath
                ],

            name:
                'Python',

            extension:
                '.py'
        }
    ],


    rust: [

        {
            command:
                'rustc',

            args:
                filePath => [
                    '--emit=metadata',
                    filePath
                ],

            name:
                'rustc',

            extension:
                '.rs'
        }
    ]
};


export async function validateCode(
    code: string,
    languageId: string
): Promise<ValidationResult> {

    const configs =
        compilerOptions[
            languageId
        ];


    if (
        !configs ||
        configs.length === 0
    ) {

        return {

            status:
                'unavailable',

            language:
                languageId,

            compiler:
                'Not supported',

            output:
                `AshenAudit: No local validator is configured for "${languageId}".`
        };
    }


    let temporaryDirectory =
        '';


    try {

        temporaryDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    'ashen-audit-'
                )
            );


        const config =
            await findAvailableCompiler(
                configs
            );


        if (!config) {

            return {

                status:
                    'unavailable',

                language:
                    languageId,

                compiler:
                    configs
                        .map(
                            item =>
                                item.name
                        )
                        .join(
                            ', '
                        ),

                output:
                    `No supported local compiler/interpreter was found on PATH.`
            };
        }


        const filePath =
            path.join(
                temporaryDirectory,
                `code${config.extension}`
            );


        await writeFile(
            filePath,
            code,
            'utf8'
        );


        console.log(
            `AshenAudit: Running local validation with ${config.name}...`
        );


        try {

            const result =
                await execFileAsync(
                    config.command,
                    config.args(
                        filePath
                    ),
                    {
                        timeout:
                            15000,

                        windowsHide:
                            true,

                        maxBuffer:
                            1024 * 1024,

                        encoding:
                            'utf8'
                    }
                );


            const stdout =
                String(
                    result.stdout ||
                    ''
                );


            const stderr =
                String(
                    result.stderr ||
                    ''
                );


            const output =
                `${stdout}\n${stderr}`
                    .trim();


            return {

                status:
                    'passed',

                language:
                    languageId,

                compiler:
                    config.name,

                output:
                    output ||
                    'Local validation passed.'
            };


        } catch (error) {

            const errorObject =
                error as {
                    stdout?: string | Buffer;
                    stderr?: string | Buffer;
                    message?: string;
                };


            const stdout =
                String(
                    errorObject.stdout ||
                    ''
                );


            const stderr =
                String(
                    errorObject.stderr ||
                    ''
                );


            const output =
                `${stderr}\n${stdout}`
                    .trim();


            return {

                status:
                    'failed',

                language:
                    languageId,

                compiler:
                    config.name,

                output:
                    output ||
                    errorObject.message ||
                    'Local validation failed.'
            };
        }


    } catch (error) {

        const message =
            error instanceof Error
                ? error.message
                : String(error);


        return {

            status:
                'unavailable',

            language:
                languageId,

            compiler:
                'Unknown',

            output:
                `AshenAudit: Local validation could not start. ${message}`
        };


    } finally {

        if (
            temporaryDirectory
        ) {

            try {

                await rm(
                    temporaryDirectory,
                    {
                        recursive:
                            true,

                        force:
                            true
                    }
                );

            } catch (error) {

                console.error(
                    'AshenAudit: Failed to clean temporary validation files:',
                    error
                );
            }
        }
    }
}


async function findAvailableCompiler(
    configs: CompilerConfig[]
): Promise<CompilerConfig | null> {

    for (
        const config of configs
    ) {

        if (
            await commandExists(
                config.command
            )
        ) {

            return config;
        }
    }


    return null;
}


async function commandExists(
    command: string
): Promise<boolean> {

    try {

        const lookupCommand =
            process.platform ===
            'win32'
                ? 'where.exe'
                : 'which';


        await execFileAsync(
            lookupCommand,
            [command],
            {
                windowsHide:
                    true,

                timeout:
                    5000
            }
        );


        return true;

    } catch {

        return false;
    }
}