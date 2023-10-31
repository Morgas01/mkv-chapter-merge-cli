let api=require("mkv-chapters");
let Enquirer=require("enquirer");
let PATH = require("path");
let SC=require("morgas").shortcut({
	Helper:"FileHelper",
	File:"File",
	utils:"File/util",
	flatten:"flatten",
	register:"register",
	mapRegister:"mapRegister",
	removeIf:"array.removeIf"
});
let EditableChapter=require("../menu/chapters/EditableChapter");
let ChapterEditor=require("../prompts/ChapterEditor");

let getEditableChapters=function(fileInfos,{skipHidden=true}={})
{
	let rtn=[];
	let register=SC.register(2,()=>({chapter:null,parsed:[]}));
	for(let fInfo of fileInfos)
	{
		for(let chapter of fInfo.chapters)
		{
			let segment=chapter.segmentUID.toString("hex");

			let edition=chapter.segmentEditionUID?chapter.segmentEditionUID:"";
			let registerEntry=register[segment][edition];
			let uniqueChapter=registerEntry.chapter
			if(!uniqueChapter)
			{
				uniqueChapter=registerEntry.chapter=chapter;
			}
			if(registerEntry.parsed.length==1)registerEntry.parsed[0].duplicate=true;

			let editable=new EditableChapter(uniqueChapter,{filename:PATH.parse(fInfo.path).name,duplicate:registerEntry.parsed.length>0});
			registerEntry.parsed.push(editable);
			rtn.push(editable);
		}
	}
	return rtn;
};

module.exports=async function ({files,outStream,path,enquirer=new Enquirer(),limit=enquirer.options.limit||10,options:{skipHidden=true}={}})
{
    enquirer.register("optionsprompt",require("../prompts/OptionsPrompt"));

	outStream.write("parsing...\n");
	let fileInfos=await Promise.all(files.map(f=>api.readFileInfo(f.getAbsolutePath()))).catch(e=>{console.error(e);return []});
	SC.removeIf(fileInfos,f=>f==null);
	if(skipHidden)
	{
		outStream.write("filter skipped chapters...\n");
		fileInfos.forEach(fInfo=>fInfo.chapters=fInfo.chapters.filter(c=>!c.hidden));
	}
	outStream.write("fixing things...\n");
	fileInfos.forEach(fInfo=>
	{
		api.repair.sortChapters(fInfo);
		api.repair.fillGaps(fInfo);
	});
	outStream.write("linking chapters...\n");
	fileInfos.forEach(fInfo=>fInfo.chapters=fInfo.chapters.map(c=>c.createLinkedChapter({fileInfo:fInfo})));

	let chapters=getEditableChapters(fileInfos);

	let mergeOptions={
		prependFileName:true
	};

	let chapterMenuIndex=0;
	let chapterMenu=()=>
	{
		return new enquirer.prompts.select({
			header:chapters.filter(c=>!c.skip).length+"/"+chapters.length+" Chapters",
			message:"select an action",
			index:chapterMenuIndex,
			choices:[
				{
					message:"edit chapter",
					value:"edit"
				},
				{
					message:"options",
					value:"options"
				},
				{
					message:"merge chapters",
					value:"merge"
				},
				{
					message:"back",
					value:"back"
				}
			],
			onSubmit:function(){chapterMenuIndex=this.index}
		}).run();
	};
	let edit=async ()=>
	{
		return chapters=await(new ChapterEditor({
			message:"edit",
			choices:chapters,
			limit
		}).run());
	};
	let selectMergeOptions=async ()=>
	{
		mergeOptions=(await enquirer.prompt({
			type:"optionsprompt",
			name:"options",
			message:"options",
			choices:[
				{
					name:"prependFileName",
					message:"prepend FileName to chapters",
					choices:[
						{name:"Yes",value:true,selected:mergeOptions.prependFileName},
						{name:"No",value:false,selected:!mergeOptions.prependFileName},
					]
				}
			],
			multiple:true
		})).options;
	}
	let merge= async()=>
	{
		let mergeChapters=chapters.map(function(editableChapter)
		{
			if(editableChapter.skip) return null;

			let chapterCopy=new api.ChapterInfo(editableChapter.chapter);
			if(mergeOptions.prependFileName) chapterCopy.name=editableChapter.filename+":"+editableChapter.chapterName;

			return chapterCopy;
		})
		.filter(a=>a); // filter nulls

		let output = await SC.utils.findUnusedName(new SC.File(path).changePath("merged.mkv"));
		let outFile=api.FileInfo.createLinkedFile(mergeChapters,{path:output});
		await outFile.writeToFile();
		outStream.write("merged into "+outFile.path+"\n");
	};

	while(true)
	{
		let chapterMenuAction=await chapterMenu();

		try
		{
			switch(chapterMenuAction)
			{
				case "edit":
					await edit();
					break;
				case "options":
					await selectMergeOptions();
					break;
				case "merge":
					await merge();
					break;
				case "back":
					return;
					break;
			}
		}
		catch(error)
		{
			if(error)console.error(error)
		}
	}
}