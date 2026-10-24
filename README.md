# demo-mode

A Claude Code mod for clean demos. `/demo on` archives every active chat except a keep-list, so people don't see your past work. `/demo off` unarchives exactly the chats it hid.

Commands: `/demo on`, `/demo off`, `/demo status`, `/demo keep <title text>`, `/demo unkeep <title text>`.

Archiving stops a chat's process and cleans up its worktree; pinned, running, or open chats are skipped. The app may ask you to approve each archive.

## Install

At the prompt of a terminal session:

```
/plugin install demo-mode --marketplace avdpe22/claudemod
```

From a shell:

```
claude plugin install demo-mode --marketplace avdpe22/claudemod
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `avdpe22/claudemod`, then Add plugin.
