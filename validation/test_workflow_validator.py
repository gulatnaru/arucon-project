import subprocess, sys, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def test_current_workflow_validator_passes():
    r=subprocess.run([sys.executable, str(ROOT/'validation/check_workflow.py')], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode==0, r.stdout+r.stderr
