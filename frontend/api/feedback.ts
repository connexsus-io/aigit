const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, type, message } = req.body;

        // Security Enhancement: Validate inputs to prevent excessive payloads and ensure data integrity
        if (!name || typeof name !== 'string' || name.length > 100) {
            return res.status(400).json({ error: 'Invalid name' });
        }
        if (!email || typeof email !== 'string' || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (!type || typeof type !== 'string' || type.length > 50) {
            return res.status(400).json({ error: 'Invalid type' });
        }
        if (!message || typeof message !== 'string' || message.length > 5000) {
            return res.status(400).json({ error: 'Invalid message' });
        }

        const { data, error } = await resend.emails.send({
            from: 'Aigit System <onboarding@resend.dev>',
            to: ['info@connexsus.io'],
            subject: `[Aigit Feedback] ${type} from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nType: ${type}\n\nMessage:\n${message}`,
        });

        if (error) {
            // Do not leak internal error details to the client
            console.error('Resend API Error:', error);
            return res.status(400).json({ error: 'Failed to send feedback' });
        }

        res.status(200).json(data);
    } catch (error) {
        // Log the actual error internally, but return a generic message
        console.error('Feedback Endpoint Error:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
}
