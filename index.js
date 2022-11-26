const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


const app = express();

// middleware
app.use(cors());
app.use(express.json());


app.get('/', async(req, res) => {
    res.send('iConnect Server')
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqmhnff.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const varifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(403).send('unauthorized')
    };
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if(err){
            return res.status(403).send({message: 'forbidden access'});
        };
        req.decoded = decoded;
        next();
    });
}

const run = async() => {
    try{
        const usersCollection = client.db('iconnect').collection('users');
        const catagoriesCollection = client.db('iconnect').collection('catagories');
        const productsCollection = client.db('iconnect').collection('products');
        

        app.get('/jwt', async(req, res) => {
            const email = req.query.email;
            const query = {
                email: email,
            };
            const user = await usersCollection.findOne(query);

            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN);
                return res.send({accessToken: token});
            };
            res.send({accessToken: ''});
        });

        app.get('/user', varifyJwt, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            
            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'})
            }

            const query = {email: email};
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        app.get('/catagories', async(req, res) => {
            const catagories = await catagoriesCollection.find({}).toArray();
            res.send(catagories);
        });

        app.get('/products/:catagoryId', async(req, res) => {
            const catagoryId = req.params.catagoryId;
            const query = {catagoryId: catagoryId};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.post('/users', async(req, res) => {
            const user = req.body;

            const query = {email: user.email};

            const alreadyHave = await usersCollection.findOne(query);

            if(alreadyHave){
                return res.send(alreadyHave);
            };

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });





















    }
    finally{

    }
};

run().catch(err => console.log(err));

app.listen(port, () => {
    console.log(`Server Running on Port ${port}`);
})