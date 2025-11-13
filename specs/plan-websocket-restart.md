# WebSocket Server Restart & Test Suite Fix Plan

## Objective
Fix the WebSocket server startup issue and ensure all tests pass, including real-time functionality.

## Current Issues Identified
- Server fails to start with `USE_SOCKETIO=1` because `create_app()` returns a tuple `(app, socketio)` instead of a callable Flask app
- WebSocket tests fail to receive events despite emissions occurring
- 200+ flake8 style violations across codebase
- Full test suite has 2 failures and 1 error

## Detailed Action Plan

### Phase 1: Constitution & Setup
**Status:** In Progress

1. **Constitution Check**
   - Verify compliance with jeetSocial Constitution (Version 2.1.2)
   - Ensure TDD approach: failing tests first, then implementation
   - Confirm privacy/moderation norms are maintained
   - Document any deviations with complexity justification

### Phase 2: Server Startup Fix
**Status:** Pending

2. **Create Failing Test for Server Startup**
   - Write test that reproduces the tuple return issue
   - Test should fail with current implementation
   - Verify test captures the exact error: `'tuple' object has no attribute 'test_client'`

3. **Fix App Factory to Return Callable App**
   - Modify `create_app()` in `app/__init__.py` to return only the Flask app
   - Store `socketio` instance in `app.extensions['socketio']` for access
   - Update any code that expects tuple return to use app.extensions
   - Ensure backward compatibility for non-SocketIO mode

4. **Restart Server and Verify Logs**
   - Stop any existing server processes
   - Start with: `USE_SOCKETIO=1 python run.py > /tmp/jeet-server.log 2>&1 &`
   - Verify server starts without "Application object must be callable" error
   - Confirm Socket.IO initializes correctly in logs
   - Test basic HTTP endpoint responds

### Phase 3: WebSocket Test Fixes
**Status:** Pending

5. **Run Full WebSocket Test Suite**
   - Execute: `pytest -q tests/test_websocket.py tests/test_websocket_temp.py`
   - Document which tests fail and why
   - Capture detailed logs with `-s` flag for failing tests
   - Identify pattern in failures (welcome events, broadcast events)

6. **Diagnose WebSocket Test Failures**
   - Run failing tests individually with verbose output
   - Add debug logging to `app/websocket.py` event handlers
   - Verify test clients are connecting to correct socketio instance
   - Check room joining/leaving logic in tests
   - Confirm event emission parameters match test expectations

7. **Implement WebSocket Fixes**
   - Fix event emission issues in `app/websocket.py`
   - Ensure proper room management for feed and post rooms
   - Verify welcome event is sent on connection
   - Fix any namespace or event name mismatches
   - Update test fixtures if needed to use correct socketio instance

8. **Re-run WebSocket Tests**
   - Execute full WebSocket test suite again
   - All tests should pass before proceeding
   - Verify no regressions in previously passing tests

### Phase 4: Full Test Suite & Quality
**Status:** Pending

9. **Run Full Pytest Suite**
   - Execute: `pytest -q`
   - All tests should pass (58+ tests expected)
   - Address any remaining failures
   - Ensure no test relies on external server being running

10. **Run Flake8 and Fix Lint Issues**
    - Execute: `flake8 .`
    - Fix critical violations first (import errors, syntax issues)
    - Address style violations systematically:
      - Remove unused imports (F401)
      - Fix line length issues (E501)
      - Clean up whitespace (W293, W292)
      - Add missing blank lines (E302)
    - Re-run flake8 until clean or acceptable level

### Phase 5: Final Verification
**Status:** Pending

11. **Final Verification & Documentation**
    - Restart server one final time to confirm stability
    - Run full test suite again to ensure no regressions
    - Test real-time functionality manually if possible
    - Update any documentation affected by changes
    - Create summary of changes made

## Success Criteria
- [ ] Server starts successfully with `USE_SOCKETIO=1`
- [ ] All WebSocket tests pass (11+ tests)
- [ ] Full test suite passes (58+ tests)
- [ ] Flake8 violations reduced to acceptable level (<50)
- [ ] Real-time functionality verified working
- [ ] No regressions in existing functionality

## Risk Mitigation
- Backup current working state before making changes
- Test each change individually before proceeding
- Keep detailed logs of what was changed and why
- Have rollback plan if critical functionality breaks

## Notes
- Each step must be verified before moving to next
- Use `pytest -k <test_name> -s` for detailed debugging
- Server logs should be monitored throughout process
- All changes should maintain jeetSocial's privacy and kindness mission