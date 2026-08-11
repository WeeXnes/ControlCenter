const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

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

// Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    avatarImage: { type: String, default: '/avatar-placeholder.svg' },
    bannerImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    joinDate: { type: Date, default: Date.now },
    password: { type: String, required: true },
    roles: { type: [String], default: ['User'] },
    banned: { type: Boolean, default: false },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ReplySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
});
const Reply = mongoose.models.Reply || mongoose.model('Reply', ReplySchema);

const PostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

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

// A curated list of adjectives and nouns to generate random nicknames
const ADJECTIVES = [
    'Super', 'Cyber', 'Pixel', 'Sleek', 'Hyper', 'Swift', 'Silent', 'Alpha', 'Brave', 'Golden',
    'Mega', 'Quantum', 'Glitch', 'Crypto', 'Dynamic', 'Hidden', 'Phantom', 'Cosmic', 'Vibrant', 'Shadow',
    'Solar', 'Lunar', 'Iron', 'Bronze', 'Wild', 'Agile', 'Smart', 'Elite', 'Ghost', 'Stellar'
];

const NOUNS = [
    'Coder', 'Ninja', 'Dev', 'Hacker', 'Warrior', 'Wizard', 'Falcon', 'Raptor', 'Knight', 'Panda',
    'Tiger', 'Fox', 'Eagle', 'Geek', 'Guru', 'Pilot', 'Nomad', 'Slayer', 'Gladiator', 'Sentry',
    'Spectre', 'Ranger', 'Scout', 'Hunter', 'Samurai', 'Monk', 'Phoenix', 'Titan', 'Apex', 'Warden'
];

function generateNickname() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3-digit number
    return `${adj}${noun}${num}`;
}

const POST_TEMPLATES = [
  {
    title: 'Mastering Vue 3 Composition API',
    content: 'Vue 3\'s Composition API is a game-changer for organizing code. Instead of grouping by options (data, methods, computed), you can group by logical concern. This makes component refactoring and composable extraction incredibly seamless. What are your thoughts on using setup script vs setup functions?'
  },
  {
    title: 'Setting up OneDev for Git hosting & CI/CD',
    content: 'I recently migrated some repositories to OneDev. It is surprisingly lightweight compared to GitLab, and the visual build specification designer makes CI workflows very easy to construct. Has anyone here set up custom runners or agents?'
  },
  {
    title: 'PM2 configuration tips for Production Nuxt apps',
    content: 'When hosting Nuxt 3 in production, using PM2 in cluster mode is highly recommended. Set instances to "max", use the "exec_mode: cluster", and make sure to configure proper health checks. This keeps the application highly available during restarts.'
  },
  {
    title: 'Securing REST APIs in Node.js',
    content: 'Security should never be an afterthought. Always sanitize input, enforce strict CORS headers, implement rate limiting, and sign your JWT tokens using strong secrets. Additionally, verify user roles and hierarchies for admin endpoints.'
  },
  {
    title: 'A guide to TailwindCSS typography classes',
    content: 'The @tailwindcss/typography plugin is fantastic. By wrapping markdown-rendered HTML in a "prose" class, you get beautiful default typography out of the box. You can customize headings, anchors, and lists using prose-invert or custom modifiers.'
  }
];

const COMMENTS_TEMPLATES = [
  'Awesome explanation! This helped me clarify some concepts.',
  'Thanks for sharing this, I was looking for a guide on this exact topic.',
  'Have you encountered any issues with caching on this setup?',
  'Nice write-up! I do it a bit differently using Docker containers.',
  'I highly recommend this approach, it worked perfectly in my staging environment.',
  'Interesting points. How do you handle secrets/environment variables in this case?',
  'This is super clean. The animations and design match perfectly.',
  'Do you have a Github repo or sample code for this?'
];

// Parse Command Line Arguments
function parseArgs() {
    const args = { count: 10 }; // Default count is 10
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, val] = arg.slice(2).split('=');
            if (key === 'count') {
                args.count = parseInt(val, 10) || 10;
            }
        }
    });
    return args;
}

async function main() {
    const args = parseArgs();
    const count = args.count;
    
    console.log(`Starting generation of ${count} random users, posts, and comments...`);

    await connectToDatabase();

    try {
        const usersToInsert = [];
        const passwordHash = await bcrypt.hash('password123', 10);
        
        for (let i = 0; i < count; i++) {
            const username = generateNickname();
            const email = `${username.toLowerCase()}@weexnes.dev`;
            
            let roles = ['User'];
            const rand = Math.random();
            if (rand < 0.05) {
                roles = ['Owner'];
            } else if (rand < 0.15) {
                roles = ['Moderator'];
            } else if (rand < 0.30) {
                roles = ['Developer'];
            }

            usersToInsert.push({
                username,
                email,
                avatarImage: '/avatar-placeholder.svg',
                bannerImage: '',
                bio: `Hello! I am a randomly generated test user named ${username}.`,
                password: passwordHash,
                roles,
                banned: false,
                posts: []
            });
        }

        console.log(`Hashing complete. Inserting users...`);
        const insertedUsers = await User.insertMany(usersToInsert);
        console.log(`Successfully created ${insertedUsers.length} new test users.`);

        // Generate random posts for users (each user has 60% chance of creating a post)
        console.log(`Generating posts...`);
        const generatedPosts = [];
        for (const user of insertedUsers) {
            if (Math.random() < 0.6) {
                const template = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
                
                // Random time within past 7 days
                const offsetMs = Math.floor(Math.random() * 3600000 * 24 * 7);
                
                const post = new Post({
                    user: user._id,
                    title: template.title + ' (Discussion)',
                    content: template.content,
                    createdAt: new Date(Date.now() - offsetMs),
                    replies: []
                });
                const savedPost = await post.save();
                generatedPosts.push(savedPost);
                
                // Add reference to user posts list
                user.posts.push(savedPost._id);
                await user.save();
            }
        }
        console.log(`Successfully created ${generatedPosts.length} posts.`);

        // Generate comments/replies of users on each other's posts
        if (generatedPosts.length > 0) {
            console.log(`Generating comments/replies...`);
            let commentsCount = 0;
            for (const post of generatedPosts) {
                // Generate 1 to 3 comments per post
                const numComments = Math.floor(Math.random() * 3) + 1;
                for (let k = 0; k < numComments; k++) {
                    // Pick a random user that is NOT the post author
                    const otherUsers = insertedUsers.filter(u => u._id.toString() !== post.user.toString());
                    if (otherUsers.length === 0) continue;
                    
                    const commentUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
                    const commentText = COMMENTS_TEMPLATES[Math.floor(Math.random() * COMMENTS_TEMPLATES.length)];
                    
                    // Create comment with timestamp between post creation time and now
                    const comment = new Reply({
                        user: commentUser._id,
                        text: commentText,
                        createdAt: new Date(post.createdAt.getTime() + Math.random() * (Date.now() - post.createdAt.getTime()))
                    });
                    
                    const savedComment = await comment.save();
                    post.replies.push(savedComment._id);
                    commentsCount++;
                }
                await post.save();
            }
            console.log(`Successfully created ${commentsCount} comments.`);
        }

        console.log('Seeding complete!');

    } catch (error) {
        console.error('Error seeding test database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

main();
