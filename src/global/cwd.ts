// todo put all the tauri-specific stuff into a worker
import { invoke } from "@tauri-apps/api/core"
export const initialWorkingDirectory = new URL(
  await invoke<string>(
    "initial_working_directory",
  ),
)
console.log({ initialWorkingDirectory })
