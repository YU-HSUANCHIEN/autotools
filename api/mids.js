// api/mids.js
global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json(global.midDatabase);
    }
    if (req.method === 'DELETE') {
        global.midDatabase = [];
        return res.status(200).json({ message: 'Cleared' });
    }
    return res.status(405).send('Method Not Allowed');
}
