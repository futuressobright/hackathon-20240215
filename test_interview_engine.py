import httpx
import uuid
import asyncio
from rich.console import Console
from rich.table import Table

console = Console()

BASE_URL = "http://localhost:8000"

async def run_test_sequence():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        # Test cases with varying quality responses
        test_cases = [
            {
                "role": "Initial question",
                "text": "I'd like to interview about Python backend development",
                "expected_difficulty": 1.0  # Starting difficulty
            },
            {
                "role": "Strong response",
                "text": """I have extensive experience with FastAPI and Django. 
                          I've built several production systems using async/await patterns,
                          implemented complex database models, and optimized query performance.
                          I also have experience with Docker containerization and CI/CD pipelines.""",
                "expected_difficulty_direction": "increase"
            },
            {
                "role": "Weak response",
                "text": "I know a little bit about Python. I've used print statements.",
                "expected_difficulty_direction": "decrease"
            },
            {
                "role": "Medium response",
                "text": "I've worked with Flask and SQLAlchemy for basic CRUD applications.",
                "expected_difficulty_direction": "stable"
            }
        ]

        # Create results table
        table = Table(title="Interview Engine Test Results")
        table.add_column("Step", justify="right", style="cyan")
        table.add_column("Response Quality", style="magenta")
        table.add_column("Difficulty Change", style="green")
        table.add_column("Next Question", style="yellow")

        prev_difficulty = 1.0  # Initial difficulty level
        
        for i, test_case in enumerate(test_cases, 1):
            console.print(f"\n[bold blue]Test Case {i}: {test_case['role']}[/bold blue]")
            console.print("[cyan]Request:[/cyan]")
            console.print(test_case['text'])
            console.print("\n[cyan]Gemini Response:[/cyan]")
            
            try:
                response = await client.post(
                    f"{BASE_URL}/api/chat",
                    json={
                        "text": test_case["text"],
                        "session_id": session_id,
                        "topic_area": "Python backend development" if i == 1 else None
                    }
                )
            except httpx.TimeoutError:
                console.print("[red]Error: Request timed out. The server is taking too long to respond.[/red]")
                continue
            except Exception as e:
                console.print(f"[red]Error: {str(e)}[/red]")
                continue

            if response.status_code != 200:
                console.print(f"[red]Error: {response.text}[/red]")
                continue
                
            data = response.json()
            current_difficulty = data["difficulty_level"]
            difficulty_change = current_difficulty - prev_difficulty
            
            # Verify difficulty adjustment direction
            if i > 1:  # Skip first case as it's the initialization
                expected_direction = test_case["expected_difficulty_direction"]
                direction_correct = (
                    (expected_direction == "increase" and difficulty_change > 0) or
                    (expected_direction == "decrease" and difficulty_change < 0) or
                    (expected_direction == "stable" and abs(difficulty_change) < 0.2)
                )
                
                difficulty_indicator = ("↑" if difficulty_change > 0 
                                     else "↓" if difficulty_change < 0 
                                     else "→")
            else:
                direction_correct = current_difficulty == test_case["expected_difficulty"]
                difficulty_indicator = "→"

            # Add result to table
            table.add_row(
                f"Case {i}",
                f"{test_case['role']}",
                f"{difficulty_indicator} ({current_difficulty:.2f})",
                data.get("next_question", "No question generated")[:50] + "..."
            )
            
            prev_difficulty = current_difficulty
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(1)

        # Print final results table
        console.print("\n")
        console.print(table)

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_test_sequence())
