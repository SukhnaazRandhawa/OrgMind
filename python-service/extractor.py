from flask import Flask, request, jsonify
import spacy
from neo4j import GraphDatabase

app = Flask(__name__)

# Load spaCy model
nlp = spacy.load('en_core_web_sm')

# Neo4j connection
driver = GraphDatabase.driver(
    'neo4j://localhost:7687',
    auth=('neo4j', 'orgmind123')
)

def extract_entities(text):
    """Extract people, organisations, dates and key nouns from text."""
    doc = nlp(text)
    entities = []
    
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG', 'DATE', 'GPE', 'EVENT']:
            entities.append({
                'text': ent.text,
                'type': ent.label_
            })
    
    return entities

def extract_decisions(text):
    """Look for decision language in the text."""
    decision_keywords = [
        'decided', 'agreed', 'resolved', 'approved', 
        'rejected', 'reversed', 'paused', 'cancelled'
    ]
    
    doc = nlp(text)
    decisions = []
    
    for sent in doc.sents:
        sent_lower = sent.text.lower()
        for keyword in decision_keywords:
            if keyword in sent_lower:
                decisions.append({
                    'text': sent.text.strip(),
                    'keyword': keyword
                })
                break
    
    return decisions

def save_to_graph(entities, decisions, raw_text):
    """Write extracted data into Neo4j."""
    with driver.session() as session:
        
        # Save each entity as a node
        for entity in entities:
            session.run("""
                MERGE (e:Entity {name: $name, type: $type})
                SET e.last_seen = timestamp()
            """, name=entity['text'], type=entity['type'])
        
        # Save each decision as a node
        for decision in decisions:
            session.run("""
                MERGE (d:Decision {text: $text})
                SET d.keyword = $keyword, d.last_seen = timestamp()
            """, text=decision['text'], keyword=decision['keyword'])
        
        # Link PERSON entities to decisions they appear near
        people = [e for e in entities if e['type'] == 'PERSON']
        for person in people:
            for decision in decisions:
                if person['text'].lower() in decision['text'].lower():
                    session.run("""
                        MATCH (p:Entity {name: $person})
                        MATCH (d:Decision {text: $decision})
                        MERGE (p)-[:INVOLVED_IN]->(d)
                    """, person=person['text'], decision=decision['text'])

@app.route('/extract', methods=['POST'])
def extract():
    """Main endpoint — receives text, extracts entities, saves to graph."""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    
    # Extract
    entities = extract_entities(text)
    decisions = extract_decisions(text)
    
    # Save to Neo4j
    save_to_graph(entities, decisions, text)
    
    return jsonify({
        'status': 'success',
        'entities_found': len(entities),
        'decisions_found': len(decisions),
        'entities': entities,
        'decisions': decisions
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': ' Python microservice running'})

if __name__ == '__main__':
    app.run(port=5001, debug=True)