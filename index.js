const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(cors({
     origin: [
            // 'http://localhost:5173',
            'https://car-hub-1e922.web.app',
            'https://car-hub-1e922.firebaseapp.com'
     ],
        
    
     credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.14fjl5a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyJWT = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).send('Invalid token.');
    }
};

async function run() {
    try {
        await client.connect();

        const servicesCollection = client.db("carHub").collection("services");
        const bookingsCollection = client.db("carHub").collection("bookings");

        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await servicesCollection.findOne(query);
            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings', verifyJWT, async (req, res) => {
            console.log(req.query.email)
            console.log(req.user.email)

            if(req.query.email !== req.user.email){
                return res.status(403).send({message: "Forbiten Access"})
            }
            let query = {};
            // console.log('tikkkkkk', req.cookies.token)

            
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        // app.get('/bookings', verifyJWT, async (req, res) => {
        //     try {
        //         let query = {};
        //         if (req.query?.email) {
        //             query = { email: req.query.email };
        //         }
        //         const result = await bookingsCollection.find(query).toArray();
        //         res.send(result);
        //     } catch (err) {
        //         res.status(500).send('Internal Server Error');
        //     }
        // });

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateBooking = req.body;

            const updateDoc = {
                $set: {
                    status: updateBooking.status
                }
            };
            const result = await bookingsCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.post('/jwt', (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false, // Change to true in production
                    maxAge: 3600000, // 1 hour in milliseconds
                    sameSite: 'lax', // Change to 'strict' or 'lax' for local testing
                })
                .send({ success: true });
        });

        

        app.get('/protected', verifyJWT, (req, res) => {
            res.send('This is a protected route.');
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Car Hub is Running');
});

app.listen(port, () => {
    console.log(`Car Hub is Running on Port ${port}`);
});
