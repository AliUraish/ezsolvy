export const ANALYZE_QUESTIONS_PROMPT = `You are an expert educational AI. Analyze the following questions and create a pedagogical plan.

Questions:
{questions}

Provide:
1. Subject area and difficulty level
2. Key concepts needed to understand these questions
3. Recommended explanation approach (visual, step-by-step, conceptual, etc.)
4. Diagrams that would help (list specific diagram types)
5. Prerequisites the student should know

Format your response as JSON with keys: subject, difficulty, concepts, approach, diagrams, prerequisites.`;

export const DIAGRAM_SPECIFICATION_PROMPT = `Create a detailed diagram specification for NanoBanana AI to render.

Topic: {topic}
Diagram Type: {diagram_type}
Context: {context}

Generate a JSON specification with:
- type: (flowchart, graph, diagram, illustration, etc.)
- title: diagram title
- elements: array of visual elements to include
- layout: suggested layout (vertical, horizontal, circular, hierarchical)
- style: visual style preferences
- annotations: key labels and callouts

Be specific and detailed so the AI can render an accurate, educational diagram.`;

export const TRANSCRIPT_PROMPT = `You are an expert tutor explaining educational content. Generate a clear, engaging transcript that guides the student through the visual canvas.

Questions:
{questions}

Canvas Elements:
{canvas_elements}

Diagrams:
{diagrams}

Create a transcript that:
1. Introduces the topic warmly
2. Walks through each question step-by-step
3. References specific diagrams and visual elements on the canvas
4. Explains concepts clearly with examples
5. Summarizes key takeaways

Keep the tone conversational, encouraging, and student-friendly.`;

export const RESEARCH_PROMPT = `Research the following educational topic and provide relevant context with citations.

Topic: {topic}
Questions: {questions}

Provide:
1. Key concepts and definitions
2. Common misconceptions
3. Related examples
4. Helpful analogies
5. Citations for all information

Format as JSON with keys: concepts, misconceptions, examples, analogies, citations.`;

export const WHITESPACE_DETECTION_PROMPT = `Analyze this PDF page layout and determine if there is sufficient whitespace to overlay explanations and diagrams.

Page dimensions: {width}x{height}
Existing content blocks: {blocks}

Respond with JSON:
- has_space: boolean
- available_regions: array of {x, y, width, height} rectangles
- recommendation: "overlay" or "regenerate"
- reasoning: brief explanation`;

