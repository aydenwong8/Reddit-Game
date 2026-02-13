function readFirstDefined(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return `${value}`.trim();
    }
  }

  return "";
}

function resolveUserIdentity(req) {
  const userId = readFirstDefined([
    req?.user?.id,
    req?.auth?.userId,
    req?.context?.userId,
    req?.headers?.["x-reddit-user-id"],
    req?.headers?.["x-devvit-user-id"]
  ]);

  const username = readFirstDefined([
    req?.user?.username,
    req?.auth?.username,
    req?.context?.username,
    req?.headers?.["x-reddit-username"],
    req?.headers?.["x-devvit-username"]
  ]);

  if (userId) {
    return {
      userId,
      username: username || `user_${userId.slice(0, 8)}`
    };
  }

  const ip = readFirstDefined([req?.ip, req?.headers?.["x-forwarded-for"]]) || "local";
  return {
    userId: `anon:${ip}`,
    username: "anonymous"
  };
}

export { resolveUserIdentity };
