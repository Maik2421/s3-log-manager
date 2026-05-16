const express = require('express');
const cors = require('cors');
const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require('@aws-sdk/lib-storage');
const { Readable } = require('stream');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bucketName = 'logs-bucket';

// S3 Client configuration for LocalStack
const s3Client = new S3Client({
    endpoint: 'http://127.0.0.1:4566',
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
    forcePathStyle: true,
});

// Helper: Read a stream and return string
const streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

// API: List log files in bucket
app.get('/api/logs', async (req, res) => {
    try {
        const data = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        const files = data.Contents ? data.Contents.map(obj => obj.Key) : [];
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Save or update a log file
app.post('/api/log', async (req, res) => {
    const { date, message } = req.body;
    if (!date || !message) {
        return res.status(400).json({ error: 'Date and message are required.' });
    }
    const fileKey = `${date}.json`;

    try {
        
        let logsArr = [];
        try {
            const getCmd = new GetObjectCommand({ Bucket: bucketName, Key: fileKey });
            const data = await s3Client.send(getCmd);
            const fileContent = await streamToString(data.Body);
            const json = JSON.parse(fileContent);
            logsArr = Array.isArray(json.logs) ? json.logs : [];
        } catch (err) {
            
            if (err.$metadata && err.$metadata.httpStatusCode !== 404) {
                throw err;
            }
        }

        
        logsArr.push(message);

        // save updated log file
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: fileKey,
                Body: JSON.stringify({ date, logs: logsArr }),
                ContentType: "application/json",
            },
        });
        await upload.done();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
