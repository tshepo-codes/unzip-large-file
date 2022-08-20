'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const unzipper = require('unzipper');

exports.handler = async (event) => {

    try {

        for (const record of event.Records) {
            console.log('Event', JSON.stringify(event, null, 2));

            const bucket = record.s3.bucket.name;

            const zippedFileKey = record.s3.object.key;

            //Get the file stream using the unzipper plugin
            const zippedFileStream = s3
                .getObject({ Bucket: bucket, Key: zippedFileKey })
                .createReadStream()
                .on("error", (error) => console.log(`Error extracting file: `, JSON.stringify(error, null, 2)))
                .pipe(unzipper.Parse({ forceStream: true }));

            // Loop through each entry of the file stream
            for await (const streamEntry of zippedFileStream) {

                const fileKey = 'unzipped/' + streamEntry.path;

                // 'Directory' or 'File'
                const type = streamEntry.type;

                if (type === "File") {

                    // Write the unzipped streamEntry back to S3
                    await s3.putObject(
                        { Bucket: bucket, Key: fileKey, Body: streamEntry })
                        .promise();

                } else {

                    streamEntry.autodrain();

                }
            }
        }

    } catch (error) {

        console.log('Error occured', JSON.stringify(error, null, 2));

        return {
            statusCode: error.statusCode ? error.statusCode : 500,
            body: JSON.stringify({
                error: error.name ? error.name : "Exception",
                message: error.message ? error.message : "Unknown error"
            })
        };

    }
}