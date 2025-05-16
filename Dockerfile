# Use Node.js LTS version as the base image
FROM node:20.19.2-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Set NODE_ENV explicitly
ENV NODE_ENV=production

COPY .env.production ./.env.production

# Expose the port your app listens on
EXPOSE 5000

# Run the app (dotenv will pick up env variables injected via Kubernetes)
CMD ["node", "server.js"]

