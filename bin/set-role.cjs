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

// Minimal User Schema for the script
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    roles: [String]
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

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

// Parse Command Line Arguments
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, val] = arg.slice(2).split('=');
            args[key] = val;
        }
    });
    return args;
}

async function main() {
    const args = parseArgs();
    const { email, username, role } = args;

    if ((!email && !username) || !role) {
        console.log('Usage: npm run set-role -- --email=<email> --role=<role>');
        console.log('   or: npm run set-role -- --username=<username> --role=<role>');
        console.log('Valid roles: Owner, Moderator, Developer, User');
        process.exit(1);
    }

    const validRoles = ['Owner', 'Moderator', 'Developer', 'User'];
    if (!validRoles.includes(role)) {
        console.error(`Error: "${role}" is not a valid role. Valid roles are: ${validRoles.join(', ')}`);
        process.exit(1);
    }

    await connectToDatabase();

    try {
        let query = {};
        if (email) {
            query.email = email;
        } else if (username) {
            query.username = username;
        }

        const user = await User.findOne(query);
        if (!user) {
            console.error(`Error: User not found matching ${JSON.stringify(query)}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.username} (${user.email}). Current roles: ${JSON.stringify(user.roles)}`);
        
        // Update roles
        user.roles = [role];
        await user.save();
        
        console.log(`Successfully updated roles for ${user.username} to: ${JSON.stringify(user.roles)}`);
    } catch (error) {
        console.error('Error updating user role:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

main();
