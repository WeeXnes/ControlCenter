export default defineEventHandler((event) => {
  setCookie(event, 'token', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });

  return { success: true, message: 'Logged out successfully' };
});
