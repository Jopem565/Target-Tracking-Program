//test class for fetch members method 
import { fetchMembers } from "../src/app/lib/fetchMembers";

describe("testing fetchMembers for", () => {

    let employeeAccessToken = "eyJ0eXAiOiJKV1QiLCJub25jZSI6IjRHMXh2VGhtSjVPSll4ZFB0TGd4enZHa240cUw2VG1zdGdoSGJlZTFPZDgiLCJhbGciOiJSUzI1NiIsIng1dCI6Il9qTndqZVNudlRUSzhYRWRyNVFVUGtCUkxMbyIsImtpZCI6Il9qTndqZVNudlRUSzhYRWRyNVFVUGtCUkxMbyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8zYWFhOGQ3YS0yYjBiLTQyZWItYWYwYi1jOTVjMjQzNzk1ZTMvIiwiaWF0IjoxNzUxOTA5MDE3LCJuYmYiOjE3NTE5MDkwMTcsImV4cCI6MTc1MTkxMzIyNywiYWNjdCI6MCwiYWNyIjoiMSIsImFjcnMiOlsicDEiXSwiYWlvIjoiQVpRQWEvOFpBQUFBU1VBOE9xeDZjbnRNSkUwTTFMS2t0YzZrSXBDZDdiblMvbGRXZW03QlNOdHphbGNnUVdlVmViYXM0c2tUb1VIMXdCMFVrSEtBaGhIRUJ1cDkrUFJneVNNNFA3SGltQmk2UENsMExFWDNVWi95ZFNMclFIa1gvc2podmErd1NBSy9MOXhkOHNwbnJrZzZsN3ovTjZldHNOUk9jZWY3amozTXNxeGx4ZkgvU01GcXhhQncxa2JGUWNXbUJFTnF0WEtSIiwiYW1yIjpbInB3ZCIsIm1mYSJdLCJhcHBfZGlzcGxheW5hbWUiOiJUYXJnZXQgVHJhY2tpbmciLCJhcHBpZCI6ImNkMWI2YTU1LTllNmMtNGM5ZC04YjY2LWQ5NzZlNjk5MjllNCIsImFwcGlkYWNyIjoiMSIsImZhbWlseV9uYW1lIjoiVHJhbiIsImdpdmVuX25hbWUiOiJUaGVvIiwiaWR0eXAiOiJ1c2VyIiwiaXBhZGRyIjoiMjYwMzozMDIxOjE2YjQ6MTAwOjUwYWU6ZDgyYTo4MjlhOmE1NGUiLCJuYW1lIjoiVGhlbyBUcmFuIiwib2lkIjoiMDFiODFlNDgtZjI0Mi00YzYyLWE5MzMtYmRkNzkyMzNmOTM1IiwicGxhdGYiOiIzIiwicHVpZCI6IjEwMDMyMDA0QTFFMzNCRTciLCJyaCI6IjEuQVgwQWVvMnFPZ3NyNjBLdkM4bGNKRGVWNHdNQUFBQUFBQUFBd0FBQUFBQUFBQUNjQUd0OUFBLiIsInNjcCI6ImVtYWlsIEdyb3VwTWVtYmVyLlJlYWQuQWxsIG9wZW5pZCBwcm9maWxlIFVzZXIuUmVhZCBVc2VyLlJlYWQuQWxsIiwic2lkIjoiMDA1YzdmYzktMjZmNy0xMWM2LWUyM2MtMTUzNGJkZjA4ODljIiwic2lnbmluX3N0YXRlIjpbImttc2kiXSwic3ViIjoiSllsQUsyOEFfdm9iU1A0dVZpTklqRTJXYjd6RWNIRmJzUmFvMEhwS1gwVSIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJOQSIsInRpZCI6IjNhYWE4ZDdhLTJiMGItNDJlYi1hZjBiLWM5NWMyNDM3OTVlMyIsInVuaXF1ZV9uYW1lIjoiVGhlby5UcmFuQGJ5dGVyYXRpby5jb20iLCJ1cG4iOiJUaGVvLlRyYW5AYnl0ZXJhdGlvLmNvbSIsInV0aSI6IkgyQUNKdXhDTDBxUXVsYWRURTBXQUEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbImI3OWZiZjRkLTNlZjktNDY4OS04MTQzLTc2YjE5NGU4NTUwOSJdLCJ4bXNfZnRkIjoiNGhLWjNBZVUyUGZwNWFNY0hRbjNYZENrV2k2VDl3NTBZYmVxMnNEUTJFb0JkWE51YjNKMGFDMWtjMjF6IiwieG1zX2lkcmVsIjoiMSAxNiIsInhtc19zdCI6eyJzdWIiOiJZaTZPaFBaWHlXdTlwTDJxektSaTRVaTdzSG1DMmJ0ckJVb19FaFRMNlRnIn0sInhtc190Y2R0IjoxNjYyNTczNjc3fQ.jXZWTx_i9bI1ohz6PWexBHwEmI1HGDZs8-gM7-dej8a6TttR7aDCp2_qixDHJdNoZ9mfLQUi6znAVisFs0l4k-QVDRwo3GQKzJK53eGo54wXTcM3shPKrBe5g3-AWJD0LCxJqTj0M2OiABggUz2s9mYruknyztTpcVcMYV-8KlESoLIPRXBzyY9jnZfiRUZvVZ3-Sr99MU9O-ly6krKAc0ffthcUgIpIy_WYvt8z8VfVltzbdoe7HD_dH8c6T8Ex4XFoguNjALDYDGD2Sld9nZi9DCbujZ6ZT777vwL_jSanUs5z6Uv9jkYe98mMowHSZa5zEJ9SA0-D6Oqc1REPVQ"
    let faultyAccessToken = "dfajsjfk";
    let undefinedAccessToken = undefined as unknown as string;


    //fetch members of team lead for valid team lead with team members
    test("valid team lead", async () => {
        expect.assertions(1);
        const memberResponse = await fetchMembers(employeeAccessToken, "Theo");
        expect(memberResponse.members.length).not.toBe(0);
    })

    //fetch members of non team lead 
    test ("non team lead", async () => {
        expect.assertions(2);
        const memberResponse = await fetchMembers(faultyAccessToken, "");
        expect(memberResponse.members.length).toBe(0);
        expect(memberResponse.message).not.toMatch("team members successfully fetched");
    })

    test ("unvalid profile", async () => {
        expect.assertions(2);
        const memberResponse = await fetchMembers(undefinedAccessToken, "");
        expect(memberResponse.members.length).toBe(0);
        expect(memberResponse.message).not.toMatch("team members successfully fetched");
    })
})