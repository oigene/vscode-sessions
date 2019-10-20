import * as vscode from "vscode";
import * as fs from "fs";

interface IFolder {
  path: string;
}
interface ISession {
  folders: IFolder[];
  settings: object;
}

export function activate(context: vscode.ExtensionContext) {
  const storagePath: string = `${context.extensionPath}/workspaces`;
  let currentSession: string = vscode.workspace.name
    ? vscode.workspace.name.replace("(Workspace)", "")
    : "";
  // create workspaces folder if not exists
  try {
    fs.exists(storagePath, () => {}); // nodejs fs is used here because the workspace.fs does not work in try/catch
  } catch (e) {
    vscode.workspace.fs.createDirectory(vscode.Uri.file(storagePath));
  }

  registerCommand(context, "sessions.save", async () => {
    let sessionName: string | undefined = await vscode.window.showInputBox({
      prompt: "Session name.",
      value: currentSession
    });

    if (sessionName) {
      sessionName = sessionName.trim().replace(/\s+/g, "-");
      currentSession = sessionName;

      const session: ISession = {
        folders: getFolders(),
        settings: {}
      };

      const sessionUri: vscode.Uri = vscode.Uri.file(
        `${storagePath}/${sessionName}.code-workspace`
      );

      try {
        await vscode.workspace.fs.writeFile(
          sessionUri,
          Buffer.from(JSON.stringify(session))
        );
        vscode.commands.executeCommand("vscode.openFolder", sessionUri);
      } catch (e) {
        console.error(e);
      }
    }
  });

  registerCommand(context, "sessions.open", async () => {
    const workspaces = await getWorkspaces(storagePath);
    const openSessionDestinations = [
      "(1) Open in this window",
      "(2) Open in new window"
    ];
    const selection: string | undefined = await vscode.window.showQuickPick(
      // add a index to selections for easier selection
      workspaces.map((workspace, idx) => `(${idx + 1}) ${workspace}`)
    );

    if (selection) {
      const newWindow: string | undefined = await vscode.window.showQuickPick(
        openSessionDestinations
      );
      vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(
          `${storagePath}/${selection.replace(/^\(\d*\)\s/, "")}`
        ),
        newWindow === openSessionDestinations[1]
      );
    }
  });

  registerCommand(context, "sessions.delete", async () => {
    const selection: string[] | undefined = await vscode.window.showQuickPick(
      getWorkspaces(storagePath),
      {
        canPickMany: true
      }
    );

    if (selection && selection.length > 0) {
      selection.forEach(element => {
        vscode.workspace.fs.delete(
          vscode.Uri.file(`${storagePath}/${element}`)
        );
      });
    }
  });
}

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: any[]) => any
) {
  const disposable = vscode.commands.registerCommand(command, async args => {
    callback(args);
  });
  context.subscriptions.push(disposable);
}

function getFolders(): IFolder[] {
  const folders = vscode.workspace.workspaceFolders;

  return folders
    ? folders.map(folder => {
        return {
          path: folder.uri.path
        };
      })
    : [];
}

async function getWorkspaces(path: string): Promise<string[]> {
  const dirs: [string, number][] = await vscode.workspace.fs
    .readDirectory(vscode.Uri.file(path))
    .then(workspaces => workspaces);
  const workspaces: string[] = [];

  dirs.forEach(dir => {
    if (dir[0].indexOf("code-workspace") > -1 && dir[1] === 1) {
      workspaces.push(dir[0]);
    }
  });

  return workspaces;
}

// this method is called when your extension is deactivated
export function deactivate() {}
