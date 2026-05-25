import { schema, table, t } from 'spacetimedb/server';

// Define the SpacetimeDB relational schema for Cyber Cat user accounts
const spacetimedb = schema({
  users: table({ name: 'users', public: true }, {
    username: t.string().primaryKey(),
    display_name: t.string(),
    password_hash: t.string(),
    high_score: t.i32(),
    gems: t.i32(),
    is_guest: t.bool(),
    unlocked_skins: t.string(),  // JSON array stringified
    unlocked_trails: t.string(), // JSON array stringified
  })
});

export default spacetimedb;

// Reducer to insert a new user profile
export const registerUser = spacetimedb.reducer(
  {
    username: t.string(),
    displayName: t.string(),
    passwordHash: t.string(),
    highScore: t.i32(),
    gems: t.i32(),
    isGuest: t.bool(),
    unlockedSkins: t.string(),
    unlockedTrails: t.string()
  },
  (ctx, user) => {
    ctx.db.users.insert({
      username: user.username,
      display_name: user.displayName,
      password_hash: user.passwordHash,
      high_score: user.highScore,
      gems: user.gems,
      is_guest: user.isGuest,
      unlocked_skins: user.unlockedSkins,
      unlocked_trails: user.unlockedTrails
    });
  }
);

// Reducer to update gameplay statistics
export const updateStats = spacetimedb.reducer(
  {
    username: t.string(),
    highScore: t.i32(),
    gems: t.i32(),
    unlockedSkins: t.string(),
    unlockedTrails: t.string()
  },
  (ctx, data) => {
    const user = ctx.db.users.username.find(data.username);
    if (user) {
      user.high_score = Math.max(user.high_score, data.highScore);
      user.gems = Math.max(user.gems, data.gems);
      user.unlocked_skins = data.unlockedSkins;
      user.unlocked_trails = data.unlockedTrails;
      ctx.db.users.username.update(user);
    }
  }
);

// Reducer to upgrade a guest account to a secure account
export const secureUser = spacetimedb.reducer(
  {
    username: t.string(),
    passwordHash: t.string()
  },
  (ctx, data) => {
    const user = ctx.db.users.username.find(data.username);
    if (user) {
      user.password_hash = data.passwordHash;
      user.is_guest = false;
      ctx.db.users.username.update(user);
    }
  }
);

