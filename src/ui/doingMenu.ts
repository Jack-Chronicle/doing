import { Menu, ButtonComponent, Notice } from "obsidian";
import NowDoingModal from "src/modal/nowDoingModal";
import { EnhancedMenu, EnhancedMenuItem } from "src/settings/type";
import { updateTaskStatus, taskPaused, setTaskPaused, updateTitleBar } from "src/util/readDoingFile";
import DoingPlugin from "src/plugin/main"; 

export default function doingMenu() {
  const windowX = window.innerWidth;
  const windowY = window.innerHeight;
  const menuExists = document.querySelector(".menu.Doing-statusbar-menu");
  const pausedMarker = DoingPlugin.instance.settings.pausedMarker || "PAUSED";

  if (!menuExists) {
    const menu = new Menu() as unknown as EnhancedMenu;

    const menuDom = (menu as any).dom as HTMLElement;
    menuDom.addClass("Doing-statusbar-menu");

    menu.addItem((actions: EnhancedMenuItem) => {
      const actionsDom = (actions).dom as HTMLElement;

      const pauseButton = new ButtonComponent(actionsDom);
      const stopButton = new ButtonComponent(actionsDom);
      const addButton = new ButtonComponent(actionsDom);
      const viewButton = new ButtonComponent(actionsDom);

      const filename = DoingPlugin.instance.settings.filename;
      const Tfile = this.app.vault.getFileByPath(filename);

      async function modifyTaskStatus(newStatus: string, noticeMessage: string, icon: string, tooltip: string) {
        if (!Tfile) {
          new Notice("No task to modify");
          return;
        }

        const fileContents = await DoingPlugin.instance.app.vault.read(Tfile).then((data) => data.trim());
        const workingOnLastTask = DoingPlugin.instance.settings.workingOnLastTask;
        let lastTask = "";
        let regex = new RegExp(`- \\[( |${pausedMarker})\\] (.*)$`, "m");

        if (workingOnLastTask) {
          const pausedRegex = new RegExp(`- \\[${pausedMarker}\\] (.*)$`, "gm");
          const uncompletedRegex = /- \[ \] (.*)$/gm;

          const pausedMatch = [...fileContents.matchAll(pausedRegex)].pop();
          const uncompletedMatch = [...fileContents.matchAll(uncompletedRegex)].pop();

          if (pausedMatch) {
            lastTask = pausedMatch[0];
            regex = new RegExp(`- \\[${pausedMarker}\\] (.*)$`, "m");
          } else if (uncompletedMatch) {
            lastTask = uncompletedMatch[0];
            regex = /- \[ \] (.*)$/m;
          }
        } else {
          const match = fileContents.match(regex);
          if (match) {
            lastTask = match[0];
          }
        }

        if (lastTask) {
          const lentLast = lastTask.match(regex);
          if (!lentLast) return;
          const lent = lentLast.length;
          const updatedTask = lastTask.replace(regex, `- [${newStatus}] $2`); 
          const newContent = fileContents.replace(lastTask, updatedTask);

          if (fileContents !== newContent) {
            await this.app.vault.modify(Tfile, newContent);
            new Notice(noticeMessage);
            pauseButton.setIcon(icon).setTooltip(tooltip);
            let titleBar = noticeMessage;
            titleBar = await updateTitleBar(Tfile, titleBar);
            DoingPlugin.instance.updateStatusBar(titleBar);
          } else {
            new Notice("No task to modify");
          }
        } else {
          new Notice("No task to modify");
        }
      }


      pauseButton.onClick(async (e: any) => {
        if (taskPaused) {
          await modifyTaskStatus(" ", "Task resumed", "pause", "Pause task");
          setTaskPaused(false);
        } else {
          await modifyTaskStatus(pausedMarker, "Task paused", "play", "Resume task");
          setTaskPaused(true);
        }
      });

      stopButton
        .setIcon("check")
        .setTooltip("Stop task")
        .onClick(async (e: any) => {
          await modifyTaskStatus("X", "Task stopped", "pause", "Pause task");
          setTaskPaused(false);
        });

      addButton
        .setIcon("plus")
        .setTooltip("New task")
        .onClick((e: any) => {
          new NowDoingModal().open();
          //DoingPlugin.instance.updateStatusBar("New task created");
        });
      viewButton
        .setIcon("eye")
        .setTooltip("View tasks")
        .onClick((e: any) => {
          this.app.workspace.activeLeaf.openFile(this.app.vault.getAbstractFileByPath(DoingPlugin.instance.settings.filename));
        });

      updateTaskStatus(pauseButton, Tfile, taskPaused);
    });

    menu.showAtPosition({
      x: windowX - 1,
      y: windowY - 34,
    });
  }
}