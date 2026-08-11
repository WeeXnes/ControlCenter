const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
    MONGODB_USER,
    MONGODB_PASS,
    MONGODB_HOST,
    MONGODB_PORT,
    MONGODB_DB,
} = process.env;

if (!MONGODB_USER || !MONGODB_PASS || !MONGODB_HOST || !MONGODB_PORT || !MONGODB_DB) {
    console.error('Error: Missing MongoDB connection details in .env file.');
    process.exit(1);
}

async function connectToDatabase() {
    const uri = `mongodb://${MONGODB_USER}:${MONGODB_PASS}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB}?authSource=admin`;
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function main() {
    const confirm = process.argv.includes('--confirm');
    const targetUsers = process.argv.includes('--users');
    const targetPosts = process.argv.includes('--posts');
    const targetComments = process.argv.includes('--comments');

    const hasSpecificTarget = targetUsers || targetPosts || targetComments;

    // By default, if no targets are supplied, delete everything.
    const cleanUsers = targetUsers || !hasSpecificTarget;
    const cleanPosts = targetPosts || !hasSpecificTarget;
    const cleanComments = targetComments || !hasSpecificTarget;

    const targets = [];
    if (cleanUsers) targets.push('Users');
    if (cleanPosts) targets.push('Posts');
    if (cleanComments) targets.push('Comments/Replies');

    if (!confirm) {
        console.log(`\x1b[31mWARNING: This script will delete ${targets.join(', ')} from the database!\x1b[0m`);
        
        let helpCmd = 'npm run clean-db --';
        if (targetUsers) helpCmd += ' --users';
        if (targetPosts) helpCmd += ' --posts';
        if (targetComments) helpCmd += ' --comments';
        helpCmd += ' --confirm';

        console.log(`To proceed, run: \x1b[32m${helpCmd}\x1b[0m`);
        process.exit(0);
    }

    await connectToDatabase();

    try {
        console.log('Cleaning database...');

        if (cleanUsers) {
            const usersResult = await mongoose.connection.collection('users').deleteMany({});
            console.log(`Deleted ${usersResult.deletedCount} users.`);
        }

        if (cleanPosts) {
            const postsResult = await mongoose.connection.collection('posts').deleteMany({});
            console.log(`Deleted ${postsResult.deletedCount} posts.`);
        }

        if (cleanComments) {
            const repliesResult = await mongoose.connection.collection('replies').deleteMany({});
            console.log(`Deleted ${repliesResult.deletedCount} comments/replies.`);
        }

        console.log('Database cleaned successfully.');
    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

main();
