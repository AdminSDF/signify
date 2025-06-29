Please place your sound files in this directory.

The application code expects the following files to exist with these exact names and the ".mp3" extension.

- `background.mp3` (for background music)
- `click.mp3` (for button clicks)
- `error.mp3` (for error notifications)
- `levelup.mp3` (for rewards and achievements)
- `spin.mp3` (for when the wheel starts spinning)
- `tryAgain.mp3` (for when a spin results in a loss)
- `win.mp3` (for when a spin results in a win)

If your sound files have different names or formats (like .wav), you must either:
1. Rename your files to match the list above.
2. Update the filenames inside the `src/context/SoundContext.tsx` file to match your filenames.
