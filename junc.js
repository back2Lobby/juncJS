class Junc {
    constructor(context) {
        // bootstrap services
        this.ctx = context instanceof CanvasRenderingContext2D ? context : null;
        this.helper = new Helper(this);
        this.helper.addReadOnlyProperty(this,"className","Junc");
        this.idsGenerator = new IdsGenerator(this);
        this.validator = new Validator(this);
        this.nodes = new Collection("node",[],this);
        this.links = new Collection("link",[],this);
        this.selector = new Selection(this);
        this.eventManager = new EventManager(this);
        this.hover = new Hover(this);
        this.offset = {};
        this.dragHandle = null;

        this.listenableEvents = ["clickedEmptyArea"];

        this.addDefaultConfig();
    }

    addDefaultConfig(){
        this.config = {
            default: {
                colors:{
                    hovered:{
                        nodeShapeStrokeColor:"#3f51b5",
                        linkShadowColor:"#3f51b5"
                    },
                    selected:{
                        nodeShapeColor:"#009688",
                        nodeShapeStrokeColor: "#3f51b5",
                        linkStrokeColor:"#009688"
                    },
                    nodeShapeColor: "#cf3333",
                    linkStrokeColor: "#333333",
                    linkControlPointColor: "#3f51b5",
                },
                availableNodeShapes:[
                    "circle",
                    "rectangle"
                ],
                nodeImage: "",
                nodeImageScale: 50
            }
        }
    }

    createNode(shape = "circle",options = {},junc = this){
        let node = new Node(shape,options,junc);
        return node;
    }
    createLink(nodeA,nodeB,junc = this){
        let link = new Link(nodeA,nodeB,junc);
        return link;
    }

    draw(){
        this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
        this.hover.draw();
        this.selector.draw();
        let tempNodes = this.nodes.clone();
        let tempLinks = this.links.clone();
        this.nodes.truncate();
        this.links.truncate();

        
        tempLinks.items.forEach(link => {
            link.render();
        })
        tempNodes.items.forEach(node => {
            node.render();
        })

    }

    addEventListener(event,callback){
        if(event === "clickedEmptyArea"){
            this.eventManager.addEventListener(this,"clickedEmptyArea",callback);
        }
        return this;
    }
}

class Collection {
    constructor(type, items = [], junc) {
        this.junc = junc instanceof Junc ? junc : null;
        this.items = items;
        this.type = type;
    }
    
    add(item) {
        if(this.items.find(i => i.id === item.id)){
            console.warn("Item with id: " + item.id + " already exists in collection: " + this.type);
        }else{
            this.items.push(item);
        }
    }
    
    remove(item) {
        if(Number.isInteger(item)){
            this.items = this.items.filter((i) => {
                if(i.id !== item){
                    return true;
                }else{
                    if(typeof i.removeEventListeners === "function"){
                        i.removeEventListeners();
                    }
                }
            });
        }else{
            this.items = this.items.filter(i => {
                if(i.id !== item.id){
                    return true;
                }else{
                    if(typeof i.removeEventListeners === "function"){
                        i.removeEventListeners();
                    }
                }
            });
        }
    }
    
    get(index) {
        return this.items[index];
    }

    update(id,newItem){
        if(id){
            let targetItem = this.items.findIndex(item => {
                return item.id === id;
            });
            if(targetItem !== -1){
                this.items[targetItem] = newItem;
            }else{
                console.warn("No item found with id: " + id + " in collection: " + this.type);
            }
        }else{
            throw new Error('id is required to update collection item');
        }
    }

    truncate() {
        this.items = [];
    }

    // cloning it so it won't affect the original one
    clone(){
        return new Collection(this.type, this.items.slice());
    }

    get length() {
        return this.items.length;
    }
}


class IdsGenerator {
    constructor(junc) {
        this.junc = junc instanceof Junc ? junc : null;
    }
    generate(type){
        if(!type){
            throw new Error("IdsGenerator: type is not defined");
        }
        switch(type){
            case "node":
                if(this.node_id === undefined){
                    this.node_id = 1;
                }else{
                    this.node_id++;
                }
                return this.node_id;
            case "link":
                if(this.link_id === undefined){
                    this.link_id = 1;
                }
                else{
                    this.link_id++;
                }
                return this.link_id;
            case "controlPoint":
                if(this.controlPoint_id === undefined){
                    this.controlPoint_id = 1;
                }else{
                    this.controlPoint_id++;
                }
        }
    }
}

class Node {
    constructor(shape = "circle",options = {},junc) {
        this.junc = junc instanceof Junc ? junc : null;
        this.id = this.junc.idsGenerator.generate("node");
        this.junc.helper.addReadOnlyProperty(this,"className","Node");
        this.draggable = options.draggable ?? true;
        this.listenableEvents = ["click","dragstart","dragging","dragend","hover","hoverend","select","unselect"];

        switch(shape){
            case "circle":
                if(options.x && options.y && options.radius && options.color){
                    this.shape = new Circle({
                        node:this,
                        x:options.x,
                        y:options.y,
                        radius:options.radius,
                        color:options.color,
                        strokeColor:options.strokeColor,
                        backgroundImage:options.backgroundImage,
                        innerHTML:options.innerHTML,

                    });
                }else{
                    throw new Error("x, y, radius and color are required to create a circle");
                }
                break;
            case "rectangle":
                if(options.x && options.y && options.width && options.height && options.color){
                    this.shape = new Rectangle({
                        node:this,x:options.x,
                        y: options.y,
                        width:options.width,
                        height:options.height,
                        color: options.color,
                        strokeColor: options.strokeColor,
                        backgroundImage:options.backgroundImage,
                        innerHTML:options.innerHTML
                    });
                }else{
                    throw new Error("x, y, width, height and color are required to create a rectangle");
                }
                break;
            default:
                throw new Error("Shape: " + shape + " is not supported");
        }
    }

    remove() {
            //remove any link to this node
            this.junc.links.items.forEach(link => {
                if(link.nodeA.id === this.id || link.nodeB.id === this.id){
                    this.junc.links.remove(link.id);
                }
            });
    
            //remove the node
            if(this.junc.selector.selectedNode && this.junc.selector.selectedNode.id === this.id){
                this.junc.selector.removeNodeSelection();
            }
            this.junc.nodes.remove(this);
    }

    removeEventListeners(){
        this.junc.eventManager.removeEventListeners(this);
    }

    render() {
        return this.shape.render();
    }

    addEventListener(eventName, callback, options = {}){
        
        this.junc.eventManager.addEventListener(this,eventName, callback,options);
        return this;
    }
}

class Circle {
    constructor({node,x, y, radius = 20, color = null, strokeColor = null,backgroundImage = null,innerHTML = ""}) {
        this.node = node instanceof Node ? node : null;
        this.type = "circle";

        this.update({
            x:x,
            y:y,
            radius:radius,
            color:color,
            strokeColor:strokeColor,
            backgroundImage:backgroundImage,
            innerHTML:innerHTML
        },true);

        return this;
    }

    update({x = null,y = null,radius = null,color = null,strokeColor = null,backgroundImage = null,innerHTML = ""},render = false){
        
        if(x){
            this.x = x;
        }
        if(y){
            this.y = y;
        }
        if(radius){
            this.radius = radius;
        }
        if(color){
            this.color = color;
        }
        if(strokeColor){
            this.strokeColor = strokeColor;
        }
        if(backgroundImage){
            if(!this.backgroundImage){
                this.backgroundImage = {};
            }
            if(this.backgroundImage.scale !== backgroundImage.scale && backgroundImage.scale !== undefined){
                this.backgroundImage.scale = +backgroundImage.scale;
            }
            if(this.backgroundImage.url !== backgroundImage.url && backgroundImage.url !== undefined){
                this.backgroundImage.url = backgroundImage.url;
                if(!backgroundImage.url){
                    this.backgroundImage.img = null;
                }
            }
            if(this.backgroundImage.xOffset !== backgroundImage.xOffset && backgroundImage.xOffset !== undefined){
                this.backgroundImage.xOffset = backgroundImage.xOffset;
            }
            if(this.backgroundImage.yOffset !== backgroundImage.yOffset && backgroundImage.yOffset !== undefined){
                this.backgroundImage.yOffset = backgroundImage.yOffset;
            }
            if(this.backgroundImage.center !== backgroundImage.center && backgroundImage.center !== undefined){
                this.backgroundImage.center = backgroundImage.center;
            }
        }
        if(innerHTML || backgroundImage){
            
            new Promise((res,rej) => {
                
                if(innerHTML){
                    
                    let cssStyles = this.node.junc.helper.getCSSWithNeededClasses(innerHTML);
                    this.innerHTML = innerHTML;
                    let svgHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='${this.radius*2}' height='${this.radius*2}'>
                            <style>
                                ${cssStyles}
                            </style>
                            <foreignObject width='100%' height='100%' style="border-radius:50%;overflow:hidden;">
                                <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;'>
                                    ${innerHTML}
                                </div>
                            </foreignObject>
                        </svg>
                    `;
                    const svg = new Blob([svgHTML],{type:'image/svg+xml;charset=utf-8'});
                    const url = URL.createObjectURL(svg);
        
                    this.node.junc.helper.onImageLoad(url,(img) => {
                        
                        this.htmlImage = img;
                        res();
                    });
                }else{
                    res();
                }
            }).then(() => {
                
                if(backgroundImage){
                    if(backgroundImage.scale && !this.backgroundImage.scale){
                        this.backgroundImage.scale = backgroundImage.scale ? +backgroundImage.scale : this.node.junc.config.default.nodeImageScale;
                    }
                        
                    if(backgroundImage.url){
                        this.node.junc.helper.onImageLoad(backgroundImage.url ?? this.node.junc.config.default.nodeImage,(img) => {
                            
                            this.backgroundImage.img = img;
                            //actually make & render circle
                            if(render){
                                this.render();
                            }else{
                                this.node.junc.nodes.update(this.node.id,this.node);
                            }
                        });
                    }else{
                        //actually make & render circle
                        if(render){
                            this.render();
                        }else{
                            this.node.junc.nodes.update(this.node.id,this.node);
                        }
                    }
                }else{
                    
                    //actually make & render circle
                    if(render){
                        this.render();
                    }else{
                        this.node.junc.nodes.update(this.node.id,this.node);
                    }
                }
            })
        }else{
            
            //actually make & render circle
            if(render){
                this.render();
            }else{
                this.node.junc.nodes.update(this.node.id,this.node);
            }
        }
    }

    render(){
        let circle = new Path2D();
        circle.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);

        // background image or color
        if(this.backgroundImage && this.backgroundImage.img){
            let pattern = this.node.junc.ctx.createPattern(this.backgroundImage.img, "no-repeat");
            let xCenter = (this.radius*2/2) - (((this.backgroundImage.img.width * this.backgroundImage.scale) / 100) / 2);
            let yCenter = (this.radius*2/2) - (((this.backgroundImage.img.height * this.backgroundImage.scale) / 100) / 2);
            pattern.setTransform(new DOMMatrix().translate(this.x - this.radius + (this.backgroundImage.center ? xCenter : 0) + (+this.backgroundImage.xOffset ?? 0), this.y - this.radius + (this.backgroundImage.center ? yCenter : 0) + (+this.backgroundImage.yOffset ?? 0)).scale(this.backgroundImage.scale/100));
            this.node.junc.ctx.fillStyle = pattern;
        }else{
            this.node.junc.ctx.fillStyle = this.color;
        }

        // if stroke color is given
        if(this.strokeColor){
            this.node.junc.ctx.strokeStyle = this.strokeColor;
            this.node.junc.ctx.stroke(circle);
        }

        this.node.junc.ctx.fill(circle);

        // innerHTML 
        if(this.innerHTML && this.htmlImage){
            this.node.junc.ctx.drawImage(this.htmlImage,this.x - this.radius,this.y - this.radius,this.radius*2,this.radius*2);
        }

        this.node.junc.nodes.add(this.node);
        this.path2D = circle;

        return circle;
    }
}

class Rectangle {
    constructor({node,x, y, width, height, color = null, strokeColor = null,backgroundImage = null,innerHTML = ""}) {
        this.node = node instanceof Node ? node : null;
        this.type = "rectangle";
        this.update({
            x: x,
            y: y,
            width: width,
            height: height,
            color: color,
            strokeColor: strokeColor,
            backgroundImage: backgroundImage,
            innerHTML: innerHTML
        },true);
        
        return this;
    }

    update({x = null,y = null,width = null,height = null,color = null,strokeColor = null,backgroundImage = null,innerHTML = ""},render = false){
        if(x){
            this.x = x;
        }
        if(y){
            this.y = y;
        }
        if(width){
            this.width = width;
        }
        if(height){
            this.height = height;
        }
        if(color){
            this.color = color;
        }
        if(strokeColor){
            this.strokeColor = strokeColor;
        }
        if(backgroundImage){
            if(!this.backgroundImage){
                this.backgroundImage = {};
            }
            if(this.backgroundImage.scale !== backgroundImage.scale && backgroundImage.scale !== undefined){
                this.backgroundImage.scale = +backgroundImage.scale;
            }
            if(this.backgroundImage.url !== backgroundImage.url && backgroundImage.url !== undefined){
                this.backgroundImage.url = backgroundImage.url;
                if(!backgroundImage.url){
                    this.backgroundImage.img = null;
                }
            }
            if(this.backgroundImage.xOffset !== backgroundImage.xOffset && backgroundImage.xOffset !== undefined){
                this.backgroundImage.xOffset = backgroundImage.xOffset;
            }
            if(this.backgroundImage.yOffset !== backgroundImage.yOffset && backgroundImage.yOffset !== undefined){
                this.backgroundImage.yOffset = backgroundImage.yOffset;
            }
            if(this.backgroundImage.center !== backgroundImage.center && backgroundImage.center !== undefined){
                this.backgroundImage.center = backgroundImage.center;
            }
        }
        if(innerHTML || backgroundImage){
            new Promise((res,rej) => {
                if(innerHTML){
                    debugger;
                    let cssStyles = this.node.junc.helper.getCSSWithNeededClasses(innerHTML);
                    this.innerHTML = innerHTML;
                    let svgHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='${this.width}' height='${this.height}'>
                            <style>
                                ${cssStyles}
                            </style>
                            <foreignObject width='100%' height='100%' style="overflow:hidden;">
                                <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;'>
                                    ${innerHTML}
                                </div>
                            </foreignObject>
                        </svg>
                    `;
                    // const img = new Image();
                    const svg = new Blob([svgHTML],{type:'image/svg+xml;charset=utf-8'});
                    const url = URL.createObjectURL(svg);
        
                    this.node.junc.helper.onImageLoad(url,(img) => {
                        this.htmlImage = img;
                        res();
                    });
                }else{
                    res();
                }
            }).then(() => {
                if(backgroundImage){
                    if(backgroundImage.scale && !this.backgroundImage.scale){
                        this.backgroundImage.scale = backgroundImage.scale ? +backgroundImage.scale : this.node.junc.config.default.nodeImageScale;
                    }
    
                    if(backgroundImage.url){
                        this.node.junc.helper.onImageLoad(backgroundImage.url ?? this.node.junc.config.default.nodeImage,(img) => {
                            this.backgroundImage.img = img;
                            //actually make & render circle
                            this.render();
                        });
                    }else{
                        //actually make & render circle
                        if(render){
                            this.render();
                        }else{
                            this.node.junc.nodes.update(this.node.id,this.node);
                        }
                    }
                }else{
                    
                    //actually make & render circle
                    if(render){
                        this.render();
                    }else{
                        this.node.junc.nodes.update(this.node.id,this.node);
                    }
                }
            })
        }else{
            //actually make & render circle
            this.node.junc.nodes.update(this.node.id,this.node);
            this.render();
            // if(render){
            //     this.render();
            // }else{
            //     this.node.junc.nodes.update(this.node.id,this.node);
            // }
        }
    }
    render(){
        let circle = new Path2D();
        circle.rect(this.x, this.y, this.width, this.height);

        // background image or color
        if(this.backgroundImage && this.backgroundImage.img){
            let xCenter = (this.width/2) - (((this.backgroundImage.img.width * this.backgroundImage.scale) / 100) / 2);
            let yCenter = (this.height/2) - (((this.backgroundImage.img.height * this.backgroundImage.scale) / 100) / 2);
            let pattern = this.node.junc.ctx.createPattern(this.backgroundImage.img, "no-repeat");
            pattern.setTransform(new DOMMatrix().translate(this.x + (this.backgroundImage.center ? xCenter : 0) + (+this.backgroundImage.xOffset ?? 0), this.y + (this.backgroundImage.center ? yCenter : 0) + (+this.backgroundImage.yOffset ?? 0)).scale(this.backgroundImage.scale/100));
            this.node.junc.ctx.fillStyle = pattern;
        }else{
            this.node.junc.ctx.fillStyle = this.color;
        }

        // for selected
        if(this.strokeColor){
            this.node.junc.ctx.strokeStyle = this.strokeColor;
            this.node.junc.ctx.stroke(circle);
        }
        
        this.node.junc.ctx.fill(circle);

        // innerHTML 
        if(this.innerHTML && this.htmlImage){
            this.node.junc.ctx.drawImage(this.htmlImage,this.x,this.y,this.width,this.height);
        }

        this.node.junc.nodes.add(this.node);
        this.path2D = circle;

        return circle;
    }
}

class Link {
    constructor(nodeA,nodeB,junc){
        this.junc = junc instanceof Junc ? junc : null;
        this.id = this.junc.idsGenerator.generate("link");
        this.junc.helper.addReadOnlyProperty(this,"className","Link");
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.path2D = null;
        // this.controlPoint = null;
        this.makeControlPoint();
        this.listenableEvents = ["hover","hoverend","click","select","unselect"];

        this.update({
            strokeColor: this.junc.config.default.colors.linkStrokeColor,
        })
    }

    update({strokeColor = this.junc.config.default.colors.linkStrokeColor}){
        if(strokeColor){
            this.strokeColor = strokeColor;
        }
        this.junc.links.update(this.id,this);
    }

    // updateControlPoint(x,y){
    //     this.controlPoint.update(x,y);
    //     this.junc.links.update(this.id,this);
    // }

    addEventListener(eventName, callback){
        this.junc.eventManager.addEventListener(this,eventName, callback);
        return this;
    }

    makeControlPoint(){
        let nodeACenter = this.junc.helper.getCenter(this.nodeA);
        let nodeBCenter = this.junc.helper.getCenter(this.nodeB);
        this.controlPoint = new ControlPoint(this,this.controlPoint ? this.controlPoint.x : ((nodeACenter.x+nodeBCenter.x) / 2), this.controlPoint ? this.controlPoint.y :  ((nodeACenter.y+nodeBCenter.y) / 2),8,this.junc.config.default.colors.linkControlPointColor,this.controlPoint ? this.controlPoint.display : false,false);
    }

    removeEventListeners(){
        //remove event listeners for this node
        // this.junc.eventManager.removeEventListeners(this);
    }

    render(){
        let link = new Path2D();
        let nodeACenter = this.junc.helper.getCenter(this.nodeA);
        let nodeBCenter = this.junc.helper.getCenter(this.nodeB);

        link.moveTo(nodeACenter.x, nodeACenter.y);
        link.quadraticCurveTo(this.controlPoint.x, this.controlPoint.y, nodeBCenter.x, nodeBCenter.y);
        this.junc.ctx.save();
        this.junc.ctx.lineWidth = 3;
        this.junc.ctx.strokeStyle = this.strokeColor;
        this.junc.ctx.stroke(link);
        this.junc.ctx.restore();
        this.path2D = link;

        this.controlPoint.render();

        this.junc.links.add(this);
    }
}

class ControlPoint {
    constructor(link,x, y, radius, color, display = false,render = true) {
        this.link = link instanceof Link ? link : null;
        this.id = this.link.junc.idsGenerator.generate("controlPoint");
        this.link.junc.helper.addReadOnlyProperty(this,"className","ControlPoint");
        this.path2D = null;
        this.draggable = true;
        this.update({
            x: x,
            y: y,
            radius: radius,
            color: color,
            display: false,
        })

        if(render){
            this.path2D = this.render();
        }
        return this;
    }

    update({x = null,y = null, radius = null, color = null, display = null}){
        if(x){
            this.x = x;
        }
        if(y){
            this.y = y;
        }

        if(radius){
            this.radius = radius;
        }

        if(color){
            this.color = color;
        }

        if(display !== null && display !== undefined){
            this.display = display;
        }

        this.link.junc.links.update(this.link.id,this.link);
    }

    render(){
        if(this.display === true){
            let controlPoint = new Path2D();
            controlPoint.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            this.link.junc.ctx.fillStyle = this.color;
            this.link.junc.ctx.fill(controlPoint);
            this.path2D = controlPoint;
        }
    }
}

class Selection {
    constructor(junc) {
        this.junc = junc instanceof Junc ? junc : null;
        this.selectedNode = null;
        this.selectedLink = null;
    }

    draw(){
        if(this.selectedNode){
            this.updateNodeSelection(this.selectedNode,false);
        }else if(this.selectedLink){
            this.updateLinkSelection(this.selectedLink,false);
        }
    }

    updateNodeSelection(selectedNode,removeIfAlreadySelected = true) {
        // select new node
        this.selectedNode = selectedNode;

        this.junc.eventManager.executeCallback("select",this.selectedNode);
        //disselected old node
        if(!this.selectedNode && removeIfAlreadySelected && this.selectedNode === selectedNode){
            this.removeNodeSelection();
        }
    }

    updateLinkSelection(selectedLink,removeIfAlreadySelected = true) {
        // select new link
        this.selectedLink = selectedLink;
        this.junc.eventManager.executeCallback("select",this.selectedLink);
        //disselected old link
        if(!this.selectedLink && removeIfAlreadySelected && this.selectedLink && this.selectedLink === selectedLink){
            this.removeLinkSelection();
        }
    }

    removeNodeSelection(){
        
        if(this.selectedNode !== null){
            let node = this.selectedNode;
            this.selectedNode = null;
            this.junc.eventManager.executeCallback("unselect",node);
        }
    }

    removeLinkSelection(){
        if(this.selectedLink !== null){
            let link = this.selectedLink;
            this.selectedLink = null;
            this.junc.eventManager.executeCallback("unselect",link);
        }
    }

    reset(){
        this.removeNodeSelection();
        this.removeLinkSelection();
    }
}

class Hover {
    constructor(junc) {
        this.junc = junc instanceof Junc ? junc : null;
        this.hoveredNode = null;
        this.hoveredLink = null;
        this.hoveredControlPoint = null;
        this.junc.ctx.canvas.addEventListener("mousemove",this.junc.eventManager.onMouseMove.bind(this.junc.eventManager));
    }

    draw(){
        if(this.hoveredLink){
            this.addHoverToLink(this.hoveredLink);
        }else if(this.hoveredNode){
            this.addHoverToNode(this.hoveredNode);
        }else if(this.hoveredControlPoint){
            this.addHoverToControlPoint(this.hoveredControlPoint);
        }
    }
    addHoverToNode(node){
        // if(!this.hoveredNode || node.id !== this.hoveredNode.id){
            this.hoveredNode = node;
            this.junc.eventManager.executeCallback("hover",this.hoveredNode);
        // }
    }
    addHoverToLink(link){
        // if(!this.hoveredLink || link.id !== this.hoveredLink.id){
            this.hoveredLink = link;
            this.junc.eventManager.executeCallback("hover",this.hoveredLink);
        // }
    }
    addHoverToControlPoint(cp){
        // if(!this.hoveredControlPoint || cp.id !== this.hoveredControlPoint.id){
            this.hoveredControlPoint = cp;
            this.junc.eventManager.executeCallback("hover",this.hoveredControlPoint);
        // }
    }
    removeHoverFromNode(){
        if(this.hoveredNode){
            this.junc.eventManager.executeCallback("hoverend",this.hoveredNode);
            this.hoveredNode = null;
        }
    }
    removeHoverFromLink(){
        if(this.hoveredLink){
            this.junc.eventManager.executeCallback("hoverend",this.hoveredLink);
            this.hoveredLink = null;
        }
    }
    removeHoverFromControlPoint(){
        if(this.hoveredControlPoint){
            this.junc.eventManager.executeCallback("hoverend",this.hoveredControlPoint);
            this.hoveredControlPoint = null;
        }
    }
}


class Validator{
    constructor(junc){
        this.junc = junc instanceof Junc ? junc : null;
    }
    validateClickedOnNode(x,y) {
        //contains the node if it is clicked on
        let c;
        if(this.junc.nodes.items.some(node => {
            if(this.junc.ctx.isPointInPath(node.shape.path2D,x,y)){
                c = node;
                return true;
            }else{
                return false;
            }
        })){
            return c ?? true;
        }else{
            return false;
        }
    }
    validateClickedOnLinkControlPoint(x,y) {
        //contains the link if its control point is clicked on
        let cp;
        if(this.junc.links.items.some(link => {
            if(link.controlPoint && link.controlPoint.path2D && this.junc.ctx.isPointInPath(link.controlPoint.path2D,x,y)){
                cp = link.controlPoint;
                return true;
            }else{
                return false;
            }
        })){
            return cp ?? true;
        }else{
            return false;
        }
    }
    validateClickedOnLink(x,y) {
        //contains the link if its control point is clicked on
        let l;
        if(this.junc.links.items.some(link => {
            if(link.path2D && this.junc.ctx.isPointInStroke(link.path2D,x,y)){
                l = link;
                return true;
            }else{
                return false;
            }
        })){
            return l ?? true;
        }else{
            return false;
        }
    }
    validateNoLinkBetweenNodes(A,B) {
        //check if there is a link between two nodes
        if(this.junc.links.items.some(link => {
            if(link.nodeA === A && link.nodeB === B || link.nodeA === B && link.nodeB === A){
                return true;
            }else{
                return false;
            }
        })){
            return false;
        }else{
            return true;
        }
    }
}

class EventManager {
    constructor(junc){
        this.junc = junc instanceof Junc ? junc : null;
        this.availableEvents = [
            "clickedEmptyArea",
            "click",
            "select",
            "unselect",
            "hover",
            "hoverend",
            "dragstart",
            "dragging",
            "dragend",
        ];
        this.eventListenerMap = {
            clickedEmptyArea: [],
            click: [],
            select: [],
            unselect: [],
            hover: [],
            hoverend: [],
            dragstart: [],
            dragging: [],
            dragend: [],
        }
        this.initListeners();
    }
    initListeners(){
        this.availableEvents.forEach(event => {
            
            switch(event){
                case "click":
                    this.junc.ctx.canvas.addEventListener("click",this.onClick.bind(this));
                    break;
                case "dragstart":
                    this.junc.ctx.canvas.addEventListener("mousedown",this.onMouseDown.bind(this));
                    break;
            }
        });
    }

    removeListeners(){
        this.availableEvents.forEach(event => {
            
            switch(event){
                case "click":
                    this.junc.ctx.canvas.removeEventListener("click",this.onClick.bind(this));
                    break;
                case "dragstart":
                    this.junc.ctx.canvas.removeEventListener("mousedown",this.onMouseDown.bind(this));
                    break;
            }
        });
    }

    getListenersForEvent(eventName,target,returnIndex = false){
            return this.eventListenerMap[eventName][returnIndex ? 'findIndex' : 'filter'](obj => {
                if(obj.target.className && obj.target.className === target.className){
                    if(obj.target.className === "Junc"){
                        return true;
                    }else if(obj.target.className !== "ControlPoint" && obj.target.id && target.id){
                        return obj.target.id === target.id;
                    }else if(obj.target.className === "ControlPoint"){
                        return obj.target.link.id === target.link.id;
                    }
                }
            })
    }

    onClick(e) {
        let isTouchEvent = e instanceof TouchEvent;
        let clickDetectTime = isTouchEvent ? 350 : 150;
        // check if it was not a dragging event
        if(new Date() - clickTime < clickDetectTime){
            let touch = isTouchEvent ? e.touches[0] : null;
            let xOffset = isTouchEvent ? touch.pageX - this.junc.ctx.offsetLeft : e.offsetX;
            let yOffset = isTouchEvent ? touch.pageY - this.junc.ctx.offsetTop : e.offsetY;
            // get clicked node if there is one
            let clickedNode = this.junc.validator.validateClickedOnNode(xOffset,yOffset);
            let clickedControlPoint = this.junc.validator.validateClickedOnLinkControlPoint(xOffset,yOffset);
            let clickedLink = this.junc.validator.validateClickedOnLink(xOffset,yOffset);

            // if there is a clicked node
            if(clickedNode){
                this.executeCallback("click",clickedNode,{x: xOffset, y: yOffset});
            }else if(clickedControlPoint){
                this.executeCallback("click",clickedControlPoint,{x: xOffset, y: yOffset});
            }else if(clickedLink){
                this.executeCallback("click",clickedLink,{x: xOffset, y: yOffset});
            }else{
                this.executeCallback("clickedEmptyArea",this.junc,{x: xOffset, y: yOffset});
            }
        }
    }

    onMouseDown(e){
        document.body.style.touchAction = "none";
        let isTouchEvent = e instanceof TouchEvent;
        let touch = isTouchEvent ? e.touches[0] : null;
        let xOffset = isTouchEvent ? touch.pageX - this.junc.ctx.offsetLeft : e.offsetX;
        let yOffset = isTouchEvent ? touch.pageY - this.junc.ctx.offsetTop : e.offsetY;
        //to help checking if mouse is dragged
        window.clickTime = new Date();
        // if mouse down / clicked on node
        let targetLink = this.junc.validator.validateClickedOnLink(xOffset,yOffset);
        let targetControlPoint = this.junc.validator.validateClickedOnLinkControlPoint(xOffset,yOffset);
        let targetNode = this.junc.validator.validateClickedOnNode(xOffset,yOffset);
        //for node and link
        if(targetNode && targetNode.draggable){
            this.junc.offset.x = xOffset - targetNode.shape.x;
            this.junc.offset.y = yOffset - targetNode.shape.y;
            targetNode.shape.update({
                x: xOffset - this.junc.offset.x,
                y: yOffset - this.junc.offset.y
            });
            this.junc.dragHandle = targetNode;
            if(isTouchEvent){
                this.junc.ctx.canvas.addEventListener("touchmove",this.onMouseMove.bind(this));
                this.junc.ctx.canvas.addEventListener("touchend",this.onMouseUp.bind(this));
            }else{
                this.junc.ctx.canvas.addEventListener("mousemove",this.onMouseMove.bind(this));
                this.junc.ctx.canvas.addEventListener("mouseup",this.onMouseUp.bind(this));
            }

            this.executeCallback("dragstart",targetNode,{x: xOffset, y: yOffset});
        }else if(targetControlPoint && targetControlPoint.draggable){
            
            this.junc.offset.x = xOffset - targetControlPoint.x;
            this.junc.offset.y = yOffset - targetControlPoint.y;

            targetControlPoint.link.controlPoint.update({
                x: xOffset - this.junc.offset.x,
                y: yOffset - this.junc.offset.y
            });
            this.junc.dragHandle = targetControlPoint;
            if(isTouchEvent){
                this.junc.ctx.canvas.addEventListener("touchmove",this.onMouseMove.bind(this));
                this.junc.ctx.canvas.addEventListener("touchend",this.onMouseUp.bind(this));
            }else{
                this.junc.ctx.canvas.addEventListener("mousemove",this.onMouseMove.bind(this));
                this.junc.ctx.canvas.addEventListener("mouseup",this.onMouseUp.bind(this));
            }
            this.executeCallback("dragstart",targetControlPoint,{x: xOffset, y: yOffset});
        }else if(targetLink && targetLink.draggable){
            // on dragging link
        }
    }
    onMouseMove(e){
        let isTouchEvent = e instanceof TouchEvent;
        let touch = isTouchEvent ? e.touches[0] : null;
        let xOffset = isTouchEvent && touch ? touch.pageX - canvas.offsetLeft : e.offsetX;
        let yOffset = isTouchEvent && touch ? touch.pageY - canvas.offsetTop : e.offsetY;
        if(this.junc.dragHandle){
            if(this.junc.dragHandle instanceof Node){
                this.junc.dragHandle.shape.update({
                    x: xOffset - this.junc.offset.x,
                    y: yOffset - this.junc.offset.y
                });
                this.executeCallback("dragging",this.junc.dragHandle,{x: xOffset, y: yOffset});
            }else if(this.junc.dragHandle instanceof ControlPoint){
                this.junc.dragHandle.link.controlPoint.update({
                    x: xOffset - this.junc.offset.x,
                    y: yOffset - this.junc.offset.y
                });
            }
        }
        if(e instanceof MouseEvent){
            // hovering
            let targetLink = this.junc.validator.validateClickedOnLink(xOffset,yOffset);
            let targetControlPoint = this.junc.validator.validateClickedOnLinkControlPoint(xOffset,yOffset);
            let targetNode = this.junc.validator.validateClickedOnNode(xOffset,yOffset);
            if(targetNode instanceof Node){
                this.junc.hover.addHoverToNode(targetNode);
            }else if(targetLink instanceof Link){
                this.junc.hover.addHoverToLink(targetLink);
            }else if(targetControlPoint instanceof ControlPoint){
                this.junc.hover.addHoverToControlPoint(targetControlPoint);
            }

            if(targetNode instanceof Node === false){
                this.junc.hover.removeHoverFromNode();
            }
            if(targetLink instanceof Link === false){
                this.junc.hover.removeHoverFromLink();
            }
        }
    }
    
    onMouseUp(e){
        let isTouchEvent = e instanceof TouchEvent;
        let touch = isTouchEvent ? e.touches[0] : null;
        let xOffset = isTouchEvent && touch ? touch.pageX - canvas.offsetLeft : e.offsetX;
        let yOffset = isTouchEvent && touch ? touch.pageY - canvas.offsetTop : e.offsetY;
        if(e instanceof TouchEvent){
            document.body.removeEventListener("touchmove",this.onMouseMove.bind(this));
            document.body.removeEventListener("touchend",this.onMouseUp.bind(this));
            document.body.style.touchAction = "auto";
            window.clickTime = new Date();
        }else{
            document.body.removeEventListener("mousemove",this.onMouseMove.bind(this));
            document.body.removeEventListener("mouseup",this.onMouseUp.bind(this));
        }
        if(this.junc.dragHandle){
            this.executeCallback("dragend",this.junc.dragHandle,{x: xOffset, y: yOffset});
        }

        this.junc.dragHandle = null;
    }

    executeCallback(eventName,target,options = {}){
        this.getListenersForEvent(eventName,target).forEach(listener => {
            if(eventName === "unselect"){
                
            }
            if(listener.isExecutedOnce && !listener.runWithAnimationLoop){
                if(listener.target instanceof Node){
                    if(eventName === "select"){
                        if(this.junc.selector.selectedNode && this.junc.selector.selectedNode.id === listener.target.id){
                            return false;
                        }
                    }
                }else if(listener.target instanceof Link){
                    if(eventName === "select"){
                        if(this.junc.selector.selectedLink && this.junc.selector.selectedLink.id === listener.target.id){
                            return false;
                        }
                    }
                }
                this.junc.ctx.save();
                listener.callback(options,target,this.junc);
                listener.isExecutedOnce = true;
                this.junc.ctx.restore();     
            }else{

                if(listener.target instanceof Node){
                    if(eventName === "unselect"){
                        if(!this.junc.selector.selectedNode){
                            if(this.getListenersForEvent("select",listener.target)){
                                this.eventListenerMap['select'][this.getListenersForEvent("select",listener.target,true)].isExecutedOnce = false;
                            }
                        }
                    }
                }else if(listener.target instanceof Link){
                    if(eventName === "unselect"){
                        if(!this.junc.selector.selectedLink){
                            if(this.getListenersForEvent("select",listener.target)){
                                this.eventListenerMap['select'][this.getListenersForEvent("select",listener.target,true)].isExecutedOnce = false;
                            }
                        }
                    }
                }

                this.junc.ctx.save();
                listener.callback(options,target,this.junc);
                listener.isExecutedOnce = true;
                this.junc.ctx.restore();
            }
        });
    }

    addEventListener(target,eventName, callback,options = {}){
        if(target.listenableEvents.indexOf(eventName) !== -1){   
            if(this.availableEvents.includes(eventName)){
                this.eventListenerMap[eventName].push({
                    target: target,
                    callback: callback,
                    runWithAnimationLoop: options.runWithAnimationLoop ?? true,
                    isExecutedOnce: false,
                });
            }else{
                throw new Error(`Event ${eventName} is not available`);
            }
        }else{
            throw new Error(`Event ${eventName} is not listenable for ${target.className ?? target.constructor.name}`);
        }
    }
    removeEventListeners(target){
        this.availableEvents.forEach(eventName => {
            this.eventListenerMap[eventName] = this.eventListenerMap[eventName].filter(listener => {
                if(listener.target.className && listener.target.className === target.className && listener.target.id && listener.target.id === target.id){
                    return false;
                }else{
                    return true;
                }
            });
        });
    }
    reset(){
        this.removeListeners();
        this.eventListenerMap = {
            clickedEmptyArea: this.eventListenerMap.clickedEmptyArea,
            click: [],
            select: [],
            unselect: [],
            dragstart: [],
            hover: [],
            hoverend: [],
            dragging: [],
            dragend: [],
        }
    }
}

class Helper {
    constructor(junc){
        this.junc = junc instanceof Junc ? junc : null;
    }
    getCenter(node){
        if(node.shape instanceof Circle){
            return {
                x: node.shape.x,
                y: node.shape.y
            }
        }else if(node.shape instanceof Rectangle){
            return {
                x: node.shape.x + node.shape.width/2,
                y: node.shape.y + node.shape.height/2
            }
        }
    }

    // the callback will have first parameter as the image object from "new Image()" and second will have the event object
    onImageLoad(imageURL,callback){
        let image = new Image();
        image.src = imageURL;
        image.onload = callback.bind(this,image);
    }

    addReadOnlyProperty(object,propertyName,value){
        Object.defineProperty( object, propertyName, {
            value: value,
            writable: false,
            enumerable: true,
            configurable: true
        });
    }

    // finds and searches through every css loaded in this document to check for the classes used in given HTML Text and then return the css classes with defination in text format
    getCSSWithNeededClasses(htmlData){
        let cssData = "";
        // get all the classes from the html with single quote or double quote
        let classes = htmlData.match(/class=['"]([^'"]*)['"]/g);
        if(classes){
            classes = classes.map(className => className.replace(/class=['"]/g,"").replace(/['"]/g,"")).toString().replace(/,/g," ");
        }else{
            classes = [];
        }

        if(classes.length > 0){
            // get all the css from style sheets in this document matching these classes
            Array.from(document.styleSheets).forEach(styleSheet => {
                Array.from(styleSheet.cssRules).forEach(cssRule => {
                    debugger;
                    if(cssRule.selectorText){
                        if(classes.indexOf(cssRule.selectorText.replace(".","")) !== -1){
                            cssData += cssRule.cssText + "\n";
                        }
                    }
                })
            })
        }
        debugger;
        return cssData;
    }

}