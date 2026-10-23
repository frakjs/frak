import express from 'express';

const app = express();

const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Application listening on port ${port}`);
});
