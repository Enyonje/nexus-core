import Fastify from "fastify";
import { goalsRoutes } from "./routes/goals";

const app = Fastify();
app.register(goalsRoutes);

app.listen({ port: 3001 });
