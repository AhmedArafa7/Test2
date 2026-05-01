"""
Baytology: Main Orchestration Pipeline
--------------------------------------
Automates preprocessing, training, and integrity verification.
"""

import os
import subprocess
import sys


def run_script(script_path: str) -> None:
    """Executes a sub-script and halts the pipeline on failure."""
    print(f"Running: {script_path}")

    script_full_path = os.path.join(os.getcwd(), script_path)
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()

    try:
        subprocess.run([sys.executable, script_full_path], check=True, env=env)
        print(f"Completed: {script_path}\n")
    except subprocess.CalledProcessError:
        print(f"Pipeline halted because {script_path} failed.")
        raise SystemExit(1)


def main() -> None:
    print("=" * 50)
    print("BAYTOLOGY AUTOMATION PIPELINE")
    print("=" * 50)

    run_script("Data_preprocessing.py")
    run_script(os.path.join("Model", "Model_training.py"))
    run_script(os.path.join("Model", "verify_sync.py"))

    print("=" * 50)
    print("All recommendation artifacts are ready.")
    print("You can now start the API with: uvicorn app:app --reload")
    print("=" * 50)


if __name__ == "__main__":
    main()
