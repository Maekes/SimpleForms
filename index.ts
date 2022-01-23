import 'dotenv/config';
import express, { json, Request, Response, Router, urlencoded } from 'express';
import { join } from 'path';
import fs from 'fs';

import MarkdownIt from 'markdown-it';
import xlsx from 'XLSX';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { db } from './src/database';
import {
    checkLimits,
    checkIfExists,
    auth,
    handleVariables,
    filterForDatabase,
    findVariableAndReplace,
} from './src/middelware';
import { renderFile } from 'pug';
import { sendMail } from './src/mailer';

const app = express();
const port = 3000;
const backend = Router();

app.use(json());
app.use(urlencoded({ extended: true }));

// Configure PUG Template Engine
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'pug');

// Configure Static Paths
app.use('/public', express.static(__dirname + '/public'));
app.use('/images', express.static(__dirname + '/config/images'));

app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        formdata: {
            logo: '',
        },
    });
});

app.get('/formular/:formname', [checkIfExists, checkLimits], (req, res) => {
    res.render('form', {
        formdata: res.locals.formdata,
        formname: res.locals.formname,
    });
});

app.post(
    '/success/:formname',
    [checkIfExists, filterForDatabase, handleVariables],
    (req, res) => {
        res.render('success', {
            message: res.locals.formdata.successMessage || '',
        });
    }
);

app.post(
    '/submit/:formname',
    [checkIfExists, checkLimits, filterForDatabase, handleVariables],
    (req, res) => {
        let { formdata } = res.locals;
        db.insert(res.locals.dataForDatabase, async (err, newDoc) => {
            if (err) {
                res.render('form-error', {
                    error: `Es ist leider ein allgemeiner Fehler aufgetreten. ${
                        !process.env.NODE_ENV ? err.message : ''
                    }`,
                });
            } else {
                // Get Original Titles for Mail
                let dataForMail = [];
                let dataObject = {};
                Object.keys(res.locals.dataForDatabase).map((key) => {
                    var index = formdata.fields.findIndex(
                        (field) => field.name === key
                    );
                    if (index >= 0) {
                        dataForMail.push({
                            title: formdata.fields[index].title,
                            data: res.locals.dataForDatabase[key],
                        });
                        dataObject[formdata.fields[index].title] =
                            res.locals.dataForDatabase[key];
                    }
                });

                // Bestätigungs Mail an Nutzer der sich angemelet hat

                let mailTeplatePath = res.locals.formdata.mailConfirmUser
                    .template
                    ? `./config/mailTemplates/${res.locals.formdata.mailConfirmUser.template}`
                    : '';

                let mailUser = '';

                if (mailTeplatePath) {
                    let md = new MarkdownIt({
                        html: true,
                    });

                    const mdTemplate = fs
                        .readFileSync(mailTeplatePath)
                        .toString();

                    let markdownText = {
                        content: mdTemplate,
                    };

                    findVariableAndReplace(markdownText, {
                        ...res.locals.dataForDatabase,
                        title: res.locals.formdata.title,
                        description: res.locals.formdata.description,
                    });

                    mailUser += await md.render(markdownText.content);
                }

                // Add Formdata if wanted
                if (res.locals.formdata.mailConfirmUser.addFormData)
                    mailUser += renderFile('./views/mailConfirmUser.pug', {
                        dataForMail,
                        title: res.locals.formdata.title,
                        description: res.locals.formdata.description,
                    });

                await sendMail(
                    process.env.MAIL_ADDRESS,
                    res.locals.formdata.mailConfirmUser.to,
                    res.locals.formdata.mailConfirmUser.subject ||
                        `Danke für deine Anmeldung - ${res.locals.formdata.title}`,
                    mailUser,
                    res.locals.formdata.mailConfirmUser.attachments || [],
                    (error) => {
                        if (error) {
                            res.render('form-error', {
                                error: `Es ist leider ein allgemeiner Fehler aufgetreten. ${
                                    !process.env.NODE_ENV ? error : ''
                                }`,
                            });
                        }
                    }
                );

                // Benachrichtigung über neue Anmeldung
                if (res.locals.formdata.mailConfirmSelf.to) {
                    let mail = renderFile('./views/mailConfirmSelf.pug', {
                        dataForMail,
                        title: res.locals.formdata.title,
                        description: res.locals.formdata.description,
                    });

                    await sendMail(
                        'website@neuss-mitte.de',
                        res.locals.formdata.mailConfirmSelf.to,
                        res.locals.formdata.mailConfirmSelf.subject ||
                            `Neue Anmeldung - ${res.locals.formdata.title} - ${newDoc._id}`,
                        mail,
                        [],
                        (error) => {
                            if (error) {
                                res.render('form-error', {
                                    error: `Es ist leider ein allgemeiner Fehler aufgetreten. ${
                                        !process.env.NODE_ENV ? error : ''
                                    }`,
                                });
                            } else {
                                res.redirect(
                                    307,
                                    `/success/${req.params.formname}`
                                );
                            }
                        }
                    );
                } else {
                    res.redirect(307, `/success/${req.params.formname}`);
                }
            }
        });
    }
);

app.use('/reports', backend);

backend.get('/:formname', [checkIfExists, auth], (req, res) => {
    db.find({ formname: req.params.formname })
        .sort({ timestamp: -1 })
        .exec((err, reports) => {
            reports.forEach((report) => {
                let date = new Date(report.timestamp);
                report.timestamp = `${date.getDate()}.${
                    date.getMonth() + 1
                }.${date.getFullYear()} - ${date.toLocaleTimeString(
                    'de-DE'
                )} Uhr`;
            });
            res.render('reports', {
                reports,
                formdata: res.locals.formdata,
                formname: res.locals.formname,
            });
        });
});

backend.get('/:formname/xlsx', [checkIfExists, auth], (req, res) => {
    db.find({ formname: req.params.formname })
        .sort({ timestamp: 1 })
        .exec((err, reports) => {
            let wb = xlsx.utils.book_new();
            wb.Props = {
                Title: res.locals.formname,
                CreatedDate: new Date(),
            };

            let dataForTable = reports.map(
                ({ formname, _id, timestamp, ...data }) => {
                    let date = new Date(timestamp);
                    let _time = `${date.getDate()}.${
                        date.getMonth() + 1
                    }.${date.getFullYear()} - ${date.toLocaleTimeString(
                        'de-DE'
                    )} Uhr`;
                    Object.keys(data).forEach(
                        (key) =>
                            (data[key] = Array.isArray(data[key])
                                ? data[key].join(', ')
                                : data[key])
                    );
                    return Object.assign({ _time }, data);
                }
            );

            let ws = xlsx.utils.json_to_sheet(dataForTable);
            xlsx.utils.book_append_sheet(wb, ws, res.locals.formname);
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${res.locals.formname}.xlsx";`
            );
            res.end(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
        });
});

backend.get('/:formname/pdf', [checkIfExists, auth], (req, res) => {
    db.find({ formname: req.params.formname })
        .sort({ timestamp: 1 })
        .exec((err, reports) => {
            const doc = new jsPDF();
            //doc.setFont('Roboto');

            let dataForTable = reports.map(
                ({ formname, _id, timestamp, ...data }) => {
                    let date = new Date(timestamp);
                    let _time = `${date.getDate()}.${
                        date.getMonth() + 1
                    }.${date.getFullYear()} - ${date.toLocaleTimeString(
                        'de-DE'
                    )} Uhr`;
                    Object.keys(data).forEach(
                        (key) =>
                            (data[key] = Array.isArray(data[key])
                                ? data[key].join('\n')
                                : data[key])
                    );
                    return Object.assign({ _time }, data);
                }
            );

            dataForTable.forEach((data, index) => {
                doc.setFontSize(22);
                doc.text(res.locals.formdata.title, 15, 15);
                autoTable(doc, {
                    body: Object.entries(data),
                    startY: 20,
                    columnStyles: {
                        0: {
                            font: 'Roboto', // <-- place name of your font here
                            fontStyle: 'bold',
                        },
                        1: {
                            font: 'Roboto', // <-- place name of your font here
                            fontStyle: 'normal',
                        },
                    },
                });
                dataForTable.length - 1 != index && doc.addPage();
            });

            res.status(200)
                .set({ 'content-type': 'application/pdf; charset=UTF-8' })
                .send(doc.output());
        });
});

app.get('*', function (req: Request, res: Response) {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
