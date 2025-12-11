// gamify_user
// qTXwC5iYSnKq5G50

const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const crypto = require("crypto");
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const port = process.env.PORT || 3000

var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(express.json())
app.use(cors())

function generateTrackingId() {
  const prefix = "PRCL"; // your brand prefix
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const random = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6-char random hex

  return `${prefix}-${date}-${random}`;
}

const verifyFBToken = async (req, res, next) => {
  const token = req.headers.authorization;
  console.log(token)

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

    const usersCollection = db.collection("users")
    const contestsCollection = db.collection("contests")
    const paymentsCollection = db.collection("payments")
    const trackingsCollection = db.collection('trackings');
    const tasksCollection = db.collection('tasks');


    const logTracking = async (trackingId, status) => {
      const log = {
        trackingId,
        status,
        details: status.split('_').join(' '),
        createdAt: new Date()
      }
      const result = await trackingsCollection.insertOne(log);
      return result;
    }


    // -------------------- CONTESTS CODE --------------------


    app.get("/contests", async (req, res) => {
      try {
        const status = req.query.status; 
        const contestType = req.query.type;

        let query = {};

        if (status) {
          query.status = status;
        }
        if (contestType) query.contestType = { $regex: contestType, $options: "i" };

        // Sort by participants length (descending)
        const result = await contestsCollection
          .find(query)
          .sort({ participants: -1 }) 
          .toArray();

        // If participants is an array, sort manually by length
        const sortedResult = result.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));

        res.send(sortedResult);

      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });



    app.get("/contests/creator/:email", async (req, res) => {
      try {
        const email = req.params.email;

        console.log('find contest')
        const contests = await contestsCollection
          .find({ creatorEmail: email })
          .toArray();

        res.send(contests);
      } catch (error) {
        console.error("Error fetching creator contests:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // GET /contests/:contestId/submissions
    app.get("/contests/:contestId/submissions", async (req, res) => {
      const { contestId } = req.params;
      console.log('find contest submission')
      const submissions = await tasksCollection
        .find({ contestId })
        .toArray();
      res.send(submissions);
    });

    // PATCH /contests/:contestId/winner
    app.patch("/contests/:contestId/winner", async (req, res) => {
      const { contestId } = req.params;
      const { winnerId } = req.body;

      // Remove previous winner if exists
      await tasksCollection.updateMany(
        { contestId },
        { $set: { isWinner: false } }
      );

      // Set new winner
      const result = await tasksCollection.updateOne(
        { id: winnerId },
        { $set: { isWinner: true } }
      );
      console.log('update contest submission')

      res.send(result);
    });


    //   Filter by id
    app.get("/contest/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // console.log('id', id)

        const contest = await contestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!contest) {
          return res.status(404).send({ message: "Contest not found" });
        }

        res.send(contest);
      } catch (error) {
        console.error("Error fetching contest:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });


    // filter by creator email 
    app.get("/my-contests/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await contestsCollection
          .find({ creatorEmail: email })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching creator contests:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });


    // filter contests for user registration 
    app.get("/user-contests", async (req, res) => {
      try {
        const email = req.query.email;
        // console.log(email)
        if (!email) return res.status(400).send({ message: "Email is required" });
        const result = await paymentsCollection
          .find({ participantEmail: email })
          .toArray();
        // console.log('user contests=> ', result)
        res.send(result);
      } catch (error) {
        console.error("Error fetching creator contests:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // change status by admin 
    app.patch(`/contest/changeStatus/:id`, async (req, res) => {
      try {
        const id = req.params.id;
        // console.log(req.body)

        const filter = {
          _id: new ObjectId(id),
        }


        const updateDoc = { $set: req.body };
        const result = await contestsCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Contest not found" });
        }
        res.send(result)

      } catch (error) {
        console.error("Error updating contests:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    })

    // Update already existed data 
    app.patch(`/contest/:id`, async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        // Only update allowed fields, not participants
        const allowedFields = [
          'name', 'description', 'price', 'deadline',
          'image', 'contestType', 'taskInstruction',
          'prizeMoney', 'status'
        ];

        const updateObj = {};
        allowedFields.forEach(field => {
          if (updateData[field] !== undefined) updateObj[field] = updateData[field];
        });

        const result = await contestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateObj }
        );

        res.send(result);

      } catch (error) {
        console.error("Error updating contests:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    })


    //   Insert contest in db
    app.post('/contest', async (req, res) => {
      const contest = req.body;

      const trackingId = generateTrackingId();
      // contest created time
      contest.status = 'pending';
      contest.createdAt = new Date();
      contest.trackingId = trackingId;
      contest.participants = 0;
      console.log("Received body:", contest);

      logTracking(trackingId, 'contest_created');

      const result = await contestsCollection.insertOne(contest);
      res.send(result)
    })

    // delete one contests from db using id
    app.delete("/contest/:id", async (req, res) => {
      try {
        const { id } = req.params;
        // console.log(id)
        // Make sure to import ObjectId
        const result = await contestsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Contest not found" });
        }

        res.send({ message: "Contest deleted successfully" });
      } catch (error) {
        console.error("Error deleting contest:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });





    // -------------------- USER ROUTES --------------------

    // Get all users (admin only)
    app.get('/users', async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });


    // Update user role (admin only)

    // Get single user by email 5
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.send({});
      }
      // console.log('user', user)
      res.send(user);
    });

    // See user role (admin only) 
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role });
    });


    app.patch('/users/role/:email', async (req, res) => {
      // console.log("PATCH /users/role HIT");
      // console.log("Params:", req.params);
      // console.log("Body:", req.body);
      const email = req.params.email;
      const { role } = req.body;

      console.log("Email:", email, "New Role:", role);

      // 1. Find the user
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      // 2. Update the role
      const result = await usersCollection.updateOne(
        { email: email },
        { $set: { role: role } }
      );
      res.send(result);
    });



    // Create user (default role = user) 4
    app.post('/users', async (req, res) => {
      const user = req.body;

      // Ensure every new user is user role
      user.role = "user";
      user.createdAt = new Date()

      const existing = await usersCollection.findOne({ email: user.email });
      if (existing) {
        return res.send({ message: "User already exists", inserted: false });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    app.patch('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const data = req.body;

        // console.log('body',data)


        const result = await usersCollection.updateOne(
          { email },
          { $set: data }
        );

        res.send({
          message: "User updated successfully in Firebase and MongoDB",
          result
        });
      }
      catch (error) {
        console.log("Update error:", error);
        res.status(500).send({ message: "Update failed", error: error.message });
      }
    });




    // app.patch("/users/:email", async (req, res) => {
    //   const data = req.body;
    //   console.log('data',data)
    //   const result = await usersCollection.updateOne(
    //     { email: req.params.email },
    //     { $set: data },
    //   );

    //   res.send(result);
    // });

    // Delete user (admin only) 6

    app.delete('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.deleteOne({ email });
      res.send(result);
    });


    // -------------------- TASKS ROUTES --------------------
    app.post("/submit-task", async (req, res) => {
      try {
        const { contestId, participantEmail, taskText } = req.body;

        if (!contestId || !participantEmail || !taskText) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        // Prevent duplicate submissions
        const existingTask = await tasksCollection.findOne({ contestId, participantEmail });
        if (existingTask) {
          return res.send({
            success: true,
            message: "You have already submitted this task",
            data: existingTask
          });
        }

        const taskData = {
          contestId,
          participantEmail,
          taskText,
          submittedAt: new Date(),
        };

        const result = await tasksCollection.insertOne(taskData);

        res.send({
          success: true,
          message: "Task submitted successfully!",
          data: result,
        });

      } catch (error) {
        console.error("Task submit error:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });

    // Get all tasks for a specific user
    app.get("/tasks/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const userTasks = await tasksCollection
          .find({ participantEmail: email })
          .toArray();

        res.send(userTasks);
      } catch (error) {
        console.error("Error fetching user tasks:", error);
        res.status(500).send({ message: "Failed to fetch tasks", error });
      }
    });

    // Get recent winners
    app.get("/winners", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 5;
    
        // 1. Find winner tasks
        const winnerTasks = await tasksCollection
          .find({ isWinner: true })
          .sort({ submittedAt: -1 })
          .limit(limit)
          .toArray();
    
        // 2. Map over winners to attach user and contest info
        const winnersWithDetails = await Promise.all(
          winnerTasks.map(async (task) => {
            // Find user info
            const user = await usersCollection.findOne({ email: task.participantEmail });
            // Find contest info
            const contest = await contestsCollection.findOne({ _id: new ObjectId(task.contestId) });

            return {
              participantName: user?.displayName || "N/A",
              participantEmail: task.participantEmail,
              participantPhoto: user?.photoURL || "https://via.placeholder.com/150",
              contestName: contest?.name || "N/A",
              contestImage: contest?.image || "https://via.placeholder.com/300",
              contestPrize: contest?.prizeMoney || "0",
              taskText: task.taskText,
              submittedAt: task.submittedAt
            };
          })
        );
        
        res.send(winnersWithDetails);
      } catch (error) {
        console.log("Error fetching winners:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    







    // -------------------- PAYMENTS --------------------


    app.get("/payment-status", async (req, res) => {
      try {
        const { contestId, email } = req.query;
        // console.log(req.query)

        // contestId is stored as string in DB => no ObjectId needed
        const exists = await paymentsCollection.findOne({
          contestId: contestId,
          participantEmail: email
        });

        res.send({ alreadyPaid: !!exists });

      } catch (error) {
        res.status(500).send({ message: "Error checking payment", error });
      }
    });

    app.post("/payment-checkout-session", async (req, res) => {
      try {
        const {
          price,
          contestId,
          contestName,
          contestCreatorEmail,
          participantEmail,
          trackingId,
          deadline,
          participants
        } = req.body;
        // console.log("Payment body", req.body)

        if (!price || !contestId || !participantEmail) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        const amount = parseInt(price) * 100; // cents

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: amount,
                product_data: {
                  name: `Contest: ${contestName}`,
                },
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          metadata: {
            contestId,
            contestName,
            trackingId,
            contestCreatorEmail,
            deadline,
            participants
          },

          customer_email: participantEmail, // autofill Stripe email
          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}&contestId=${contestId}`,
          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
        });
        // console.log('session ',session);


        res.send({ url: session.url });
      } catch (error) {
        console.error("Stripe session error:", error);
        res.status(500).send({ message: "Stripe session failed", error });
      }
    });


    app.patch("/payment-success", async (req, res) => {
      try {
        const sessionId = req.query.session_id;
        if (!sessionId) return res.status(400).send({ message: "Session ID missing" });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) return res.status(404).send({ message: "Invalid session" });

        const {
          contestId,
          contestName,
          trackingId,
          contestCreatorEmail,
          deadline,
          participants
        } = session.metadata;

        const participantEmail = session.customer_email;
        const paymentInfo = {
          sessionId,
          contestId,
          contestName,
          contestCreatorEmail,
          trackingId,
          participantEmail,
          deadline,
          participants,
          amountPaid: session.amount_total / 100,
          status: session.payment_status,
          createdAt: new Date(),
        };
        const existingPayment = await paymentsCollection.findOne({
          participantEmail,
          contestId
        });

        console.log('existingPayment', existingPayment)
        if (existingPayment) {
          return res.send({
            success: true,
            message: "Payment already processed",
            paymentInfo: existingPayment
          });
        }

        // Save payment
        await paymentsCollection.insertOne(paymentInfo);

        // Update participants count
        await contestsCollection.updateOne(
          { _id: new ObjectId(contestId) },
          { $inc: { participants: 1 } }
        );


        const contestData = await contestsCollection.findOne({
          _id: new ObjectId(contestId),
        });

        // Send response with contest data
        res.send({
          success: true,
          message: "Payment verified successfully",
          paymentInfo,
          contest: contestData,   // <-- THIS FIXES YOUR FRONTEND
        });

      } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });












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
