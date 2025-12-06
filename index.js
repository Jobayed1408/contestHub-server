// gamify_user
// qTXwC5iYSnKq5G50

const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

const verifyFBToken = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    try {
        const idToken = token.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        console.log('decoded in the token', decoded);
        req.decoded_email = decoded.email;
        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@databasecluster.zcna5ev.mongodb.net/?appName=DatabaseCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db("gamify_collection_db");

        const gamifyCollection = db.collection("games");
        const usersCollection = db.collection("users")
        const contestsCollection = db.collection("contests")
        const submissionsCollection = db.collection("submissions")
        const paymentsCollection = db.collection("payments")

        // -------------------- GAMES ROUTES --------------------


        app.get(`/games`, async (req, res) => {

        })

        app.post(`/games`, async (req, res) => {

        })




        // -------------------- USER ROUTES --------------------

        // Create user (default role = user)
        app.post('/users', async (req, res) => {
            const user = req.body;

            // Ensure every new user is user role
            user.role = "user";

            const existing = await usersCollection.findOne({ email: user.email });
            if (existing) {
                return res.send({ message: "User already exists", inserted: false });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Get all users (admin only)
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // Get single user by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });
            res.send(user);
        });

        // Update user role (admin only)
        app.patch('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;

            const result = await usersCollection.updateOne(
                { email },
                { $set: { role } }
            );

            res.send(result);
        });

        // Delete user (admin only)
        app.delete('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.deleteOne({ email });
            res.send(result);
        });


        // -------------------- CONTEST ROUTES --------------------

        // -------------------- PAYMENTS --------------------













        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
