import type * as Express from 'express';
import type * as Multer from 'multer';
import type * as ConfigLoader from '../config-loader/config-loader';

const multerTransform: Express.RequestHandler = async (req, _res, next) => {
	try {
		if (req.files && req.files instanceof Array) {
            req.files.forEach((file: { fieldname: string | number; }) => {
				req.body[file.fieldname] = file;
			});
		}
		next();
	} catch (err) {
		next(err);
	}
};

const setup: ConfigLoader.SetupFunction = async (app: Express.Application) => {
    if (!process.browser) {
        const multer: typeof Multer = require('multer');

        const multerPinejs = multer({
            limits: {
                fieldNameSize: 300,
                fileSize: 100000, // 100 Kb
            },
            fileFilter: (req, file, callback) => {
                const acceptableExtensions = ['.png', '.jpg'];
                if (file && file.originalname) {
                    const fileExtension = file.originalname.toLowerCase().split('.').pop();
                    if (fileExtension && !(acceptableExtensions.includes(fileExtension!))) {
                        return callback(new Error('File extension not supported for image'));
                    }
                }

                // added this
                if (req.headers['content-length'] && 
                    parseInt(req.headers['content-length']) > 100000) { // 100 Kb
                    return callback(new Error('File size too large'));
                }

                callback(null, true);
            }
        });

        const acceptedRoutes = [
            '/team*', 
            '/organization*'
        ];

        acceptedRoutes.forEach((route) => {
            app.use(route, multerPinejs.any());
            app.use(route, multerTransform);
        });
    }
};

export const config: ConfigLoader.Config = {
    models: [
        {
            customServerCode: { setup },
        },
    ],
};
