let {Sort}=require("enquirer");
let µ=require("morgas");
let SC=µ.shortcut({
	Helper:"FileHelper",
	File:"File"
});

const hint="[control] <shift>+<up/down>:sort s:skip enter:finish [duplicates] a:show first d:show last  [display] f:filename";

module.exports=class ChapterEditor extends Sort
{
	constructor(options={})
	{
		options.choices=options.choices.map(chapter=>({value:chapter}));
		options.display=options.display||{};
		options.display.skip=options.display.skip!==false;
		options.display.duplicate=options.display.duplicate!==false;
		options.display.filename=options.display.filename!==false;
		options.hint=hint;
		options.visibleIndex=0;
		super(options);
		this.setMessages();
	}
	setMessages()
	{
		let fill=(""+this.choices.length).replace(/./g," ");

		for(let choice of this.choices)
		{
			choice.message=()=>(fill+this.choices.findIndex(c=>c==choice)).slice(-fill.length)+" "+choice.value.getMessage(this.options.display);
		}
	}
	up()
	{
		let visidx = this.visibleIndex;
		let idx = this.index;

		if (idx === visidx ) {
		  return this.scrollUp();
		}
		this.index = Math.max(idx - 1,0);
		return this.render();
	}

	down()
	{
		let vis = Math.min(this.visible.length,this.limit);
		let visidx = this.visibleIndex;
		let idx = this.index;
		if (idx === visidx + vis - 1)
		{
			return this.scrollDown();
		}
		this.index = Math.min(idx + 1, visidx + vis-1);
		return this.render();
	}
	scrollDown()
	{
		this.visibleIndex=Math.min(this.visibleIndex+1,this.choices.length - this.limit);
		this.index=Math.min(this.index+1,this.visibleIndex + this.limit-1);
		return this.render();
	}
	scrollUp()
	{
		this.visibleIndex=Math.max(this.visibleIndex-1,0);
		this.index=Math.max(this.index-1,this.visibleIndex);
		return this.render();
	}
	async renderChoices()
	{
		if (this.state.submitted) return '';
		let choices = this.choices.slice(this.visibleIndex,this.visibleIndex+this.limit).map(async(ch, i) => await this.renderChoice(ch, this.visibleIndex+i));
		let visible = await Promise.all(choices);
		if (!visible.length) visible.push(this.styles.danger('No matching choices'));
		let result = this.margin[0] + visible.join('\n');

		return  result;
	}
	async shiftUp()
	{
		if(this.index!==0) return super.shiftUp();
	}
	async shiftDown()
	{
		if(this.index!==this.choices.length-1) return super.shiftDown();
	}
	home()
	{
		this.visibleIndex=0;
		return this.render();
	}
	end()
	{
		this.visibleIndex=this.choices.length-this.limit;
		return this.render();
	}
	pageUp()
	{
		this.limit = Math.max(this.limit - 1, 0);
		this.index = Math.min(this.visibleIndex + this.limit - 1, this.index);
    	return this.render();
	}
	pageDown()
	{
		this.limit = Math.min(this.limit + 1, this.choices.length);
    	return this.render();
	}
	a()//toggle skip
	{
		let data=this.focused.value;
		let first=true
		for(let {value:other} of this.choices)
		{
			if(other.chapter==data.chapter)
			{
				if(first) first=false;
				else
				{
					other.skip=true;
				}
			}
		}
		return this.render();
	}
	s()//show first
	{
		let data=this.focused.value;
		data.skip=!data.skip;
		return this.render();
	}
	d()//show last
	{
		let data=this.focused.value;
		let last=null
		for(let {value:other} of this.choices)
		{
			if(other.chapter==data.chapter)
			{
				last=other;
				other.skip=true;
			}
		}
		last.skip=false;
		return this.render();
	}
	h()//toggle help
	{
		this.options.hint=this.options.hint===shortHint?longHint:shortHint;
		return this.render();
	}
	f()//toggle filename
	{
		this.options.display.filename^=1;
		return this.render();
	}
	format()
	{
		if (!this.state.submitted) return '';
		let shown=this.value.filter(e=>!e.skip);
		let fill=(""+shown.length).replace(/./g," ");
		return this.styles.primary(shown.map((e,i)=>(fill+i).slice(-fill.length)+" "+e.chapterName).join(", "));
	}
	get visible()
	{
		return this.choices;
	}
	set visible(v){}
	get visibleIndex()
	{
		return this.options.visibleIndex;
	}
	set visibleIndex(index)
	{
		this.options.visibleIndex=index;
	}
};