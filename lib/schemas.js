
const { z } = require("zod");

const TopicItem = z.object({
  topic: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  support_count: z.number().int().nonnegative(),
  example_messages: z.array(z.string()).max(3),
  confidence: z.number().min(0).max(1)
});

const TopicsSchema = z.object({
  topics: z.array(TopicItem).min(1),
  simple_topics: z.array(z.string().min(1)).min(1)
});

module.exports = { TopicsSchema };